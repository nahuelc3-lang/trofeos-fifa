let datosPartidos = [];
let torneosOrdenados = []; 
let fechasPorTorneo = {}; 
let partidosPorFechaYTorneo = {}; // NUEVO: Guardará la cantidad de partidos por cada "Torneo|Fecha"
let miGrafico = null; 

const aliasEquipos = {
    "estudiantes": "estudiantes (lp)",
    "estudiantes de la plata": "estudiantes (lp)",
    "argentinos": "argentinos juniors",
    "boca": "boca juniors",
    "river": "river plate",
    "gimnasia": "gimnasia (lp)",
    "san martin": "san martin (sj)",
    "san martin sj": "san martin (sj)"
};

function arreglarCodificacion(texto) {
    const mapa = {
        'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ãñ': 'ñ', 'Ã‘': 'Ñ',
        'ã¡': 'á', 'ã©': 'é', 'ã­': 'í', 'ã³': 'ó', 'ãº': 'ú', 'ãñ': 'ñ'
    };
    let resultado = texto;
    for (let mal in mapa) {
        resultado = resultado.split(mal).join(mapa[mal]);
    }
    return resultado;
}

async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${archivo}`);
    
    let texto = await respuesta.text();
    texto = texto.replace(/^\uFEFF/, ''); 
    texto = arreglarCodificacion(texto);
    
    const filas = texto.trim().split(/\r?\n/).filter(fila => fila.trim() !== "");
    if (filas.length === 0) return []; 

    const separador = filas[0].includes(";") ? ";" : ",";
    const columnas = filas[0].split(separador).map(c => c.trim().replace(/"/g, ''));

    return filas.slice(1).map(fila => {
        const valores = fila.split(separador);
        let objeto = {};
        columnas.forEach((columna, i) => {
            if (columna) {
                let valor = valores[i] ? valores[i].trim().replace(/"/g, '') : "";
                objeto[columna] = valor;
            }
        });
        return objeto;
    });
}

function normalizarNombre(nombre) {
    if (!nombre) return "";
    let limpio = nombre.trim().toLowerCase();
    limpio = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return aliasEquipos[limpio] || limpio;
}

function calcularResultadoEsperado(puntosA, puntosB) {
    return 1 / (1 + Math.pow(10, (puntosB - puntosA) / 400));
}

// NUEVA FUNCIÓN: Determina dinámicamente si el partido es una final o eliminatoria
function obtenerMultiplicadorInstancia(torneo, fecha) {
    let clave = `${torneo.trim()}|${fecha}`;
    let cantPartidos = partidosPorFechaYTorneo[clave] || 10; // Por defecto asumimos fecha regular

    if (cantPartidos === 1) return 2.0; // Final única o partido de desempate de descenso/campeonato
    if (cantPartidos === 2) return 1.6; // Semifinales
    if (cantPartidos === 4) return 1.3; // Cuartos de final
    if (cantPartidos === 8) return 1.1; // Octavos de final
    return 1.0; // Fecha de liga regular (10 o más partidos)
}

// MODIFICADO: Ahora recibe torneo y fecha para aplicar la importancia correspondiente
function actualizarPuntos(equipoLocal, equipoVisitante, golesLocal, golesVisitante, torneo, fecha) {
    let puntosL = equipoLocal.puntos;
    let puntosV = equipoVisitante.puntos;

    const VENTAJA_LOCAL = 75;
    let ptosLocalVirtual = puntosL + VENTAJA_LOCAL;

    let esperadoLocal = 1 / (1 + Math.pow(10, (puntosV - ptosLocalVirtual) / 400));

    let resultadoLocal;
    if (golesLocal > golesVisitante) { resultadoLocal = 1; }
    else if (golesLocal < golesVisitante) { resultadoLocal = 0; }
    else { resultadoLocal = 0.5; }

    let difGoles = Math.abs(golesLocal - golesVisitante);
    let G = 1;
    
    if (resultadoLocal !== 0.5) { 
        let difPuntos = (resultadoLocal === 1) ? (ptosLocalVirtual - puntosV) : (puntosV - ptosLocalVirtual);
        G = Math.log(difGoles + 1) * (2 / (2 + 0.001 * difPuntos));
        if (G < 1) G = 1; 
    }

    // MULTIPLICADORES COMBINADOS: K Base (25) * Margen de Goles (G) * Peso de la Instancia (Playoff/Final)
    const K_BASE = 25;
    const pesoInstancia = obtenerMultiplicadorInstancia(torneo, fecha);
    
    let cambio = K_BASE * pesoInstancia * G * (resultadoLocal - esperadoLocal); 

    equipoLocal.puntos += cambio;
    equipoVisitante.puntos -= cambio;
}

function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let diccionarioEquipos = {};
    let indiceTorneoObjetivo = torneosOrdenados.indexOf(torneoObjetivo);

    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        nombresOriginales[normalizarNombre(p.Local)] = p.Local.trim();
        nombresOriginales[normalizarNombre(p.Visitante)] = p.Visitante.trim();
    });

    for (let t = 0; t <= indiceTorneoObjetivo; t++) {
        let nombreTorneoActual = torneosOrdenados[t];
        let partidosDeEsteTorneo = datosPartidos.filter(p => (p.Torneo || "").trim() === nombreTorneoActual);
        
        let equiposEsteTorneo = new Set();
        partidosDeEsteTorneo.forEach(p => {
            equiposEsteTorneo.add(normalizarNombre(p.Local));
            equiposEsteTorneo.add(normalizarNombre(p.Visitante));
        });

        let sumaPts = 0, cantEquipos = 0;
        if (t > 0) {
            Object.values(diccionarioEquipos).forEach(eq => {
                if (eq.ultimoTorneo === t - 1) { sumaPts += eq.puntos; cantEquipos++; }
            });
        }
        let promedioLiga = cantEquipos > 0 ? (sumaPts / cantEquipos) : 1500;

        equiposEsteTorneo.forEach(nombreEq => {
            if (!diccionarioEquipos[nombreEq]) {
                let ptsIniciales = (t === 0) ? 1500 : (promedioLiga - 100);
                diccionarioEquipos[nombreEq] = { 
                    nombre: nombresOriginales[nombreEq], 
                    puntos: ptsIniciales, 
                    ultimoTorneo: t 
                };
            } else {
                if (diccionarioEquipos[nombreEq].ultimoTorneo < t - 1) {
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.7) + (promedioLiga * 0.3);
                } else if (diccionarioEquipos[nombreEq].ultimoTorneo === t - 1) {
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.95) + (1500 * 0.05);
                }
                diccionarioEquipos[nombreEq].ultimoTorneo = t;
            }
        });

        partidosDeEsteTorneo.forEach(partido => {
            let colFecha = partido.Fecha_del_Torneo || partido.fecha_del_torneo;
            let fechaDelPartido = Number(colFecha);
            
            if (t === indiceTorneoObjetivo && fechaDelPartido > fechaObjetivo) return;

            let local = diccionarioEquipos[normalizarNombre(partido.Local)];
            let visitante = diccionarioEquipos[normalizarNombre(partido.Visitante)];
            let golesLocal = Number(partido.Goles_Local || partido.goles_local);
            let golesVisitante = Number(partido.Goles_Visitante || partido.goles_visitante);
            
            // Enviamos el torneo y fecha correspondientes para calcular el multiplicador
            actualizarPuntos(local, visitante, golesLocal, golesVisitante, nombreTorneoActual, fechaDelPartido);
        });
    }

    let ranking = Object.values(diccionarioEquipos).filter(eq => eq.ultimoTorneo === indiceTorneoObjetivo);
    ranking.sort((a, b) => b.puntos - a.puntos);
    ranking.forEach((eq, index) => eq.posicion = index + 1);

    return ranking;
}

function renderizarTabla(torneoSeleccionado, fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";

    let rankingActual = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada);
    let rankingAnterior = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada - 1);
    
    let mapaAnterior = {};
    rankingAnterior.forEach(eq => {
        mapaAnterior[eq.nombre] = { posicion: eq.posicion, puntos: eq.puntos };
    });

    rankingActual.forEach((equipo) => {
        let datosAyer = mapaAnterior[equipo.nombre];
        
        let difPosicion = datosAyer ? datosAyer.posicion - equipo.posicion : 0; 
        let difPuntos = datosAyer ? equipo.puntos - datosAyer.puntos : 0;

        let iconoPos = `<span class="igual">-</span>`;
        if (difPosicion > 0) iconoPos = `<span class="sube">▲ ${difPosicion}</span>`;
        if (difPosicion < 0) iconoPos = `<span class="baja">▼ ${Math.abs(difPosicion)}</span>`;
        if (fechaSeleccionada === 0 || !datosAyer) iconoPos = `<span class="igual">-</span>`;

        let textoPts = `<span class="igual">0.00</span>`;
        if (difPuntos > 0.01) textoPts = `<span class="sube">+${difPuntos.toFixed(2)}</span>`;
        else if (difPuntos < -0.01) textoPts = `<span class="baja">${difPuntos.toFixed(2)}</span>`;
        if (fechaSeleccionada === 0 || !datosAyer) textoPts = `<span class="igual">-</span>`;

        let tagAscenso = (!datosAyer && fechaSeleccionada === 0) ? `<span style="font-size:10px; background:#ffd700; padding:2px 5px; border-radius:3px; margin-left:5px; color:black;">NUEVO</span>` : "";

        tabla.innerHTML += `
        <tr>
            <td><strong>${equipo.posicion}</strong></td>
            <td>${iconoPos}</td>
            <td class="equipo-nombre" onclick="abrirGrafico('${equipo.nombre}')">${equipo.nombre} ${tagAscenso}</td>
            <td class="puntos-totales">${Math.round(equipo.puntos)}</td>
            <td>${textoPts}</td>
        </tr>
        `;
    });
}

function abrirGrafico(nombreClub) {
    const modal = document.getElementById("modalGrafico");
    modal.style.display = "flex";
    
    document.getElementById("tituloModal").innerText = `Evolución de Posición: ${nombreClub}`;
    
    let historial = [];
    let nombreLimpio = normalizarNombre(nombreClub);
    
    let torneoSelect = document.getElementById("selectorTorneo").value;
    let limTorneoIdx = torneosOrdenados.indexOf(torneoSelect);
    
    for (let t = 0; t <= limTorneoIdx; t++) {
        let torneo = torneosOrdenados[t];
        let maxFechas = fechasPorTorneo[torneo] || 0;
        
        for (let f = 1; f <= maxFechas; f++) {
            let ranking = calcularRankingHasta(torneo, f);
            let eq = ranking.find(e => normalizarNombre(e.nombre) === nombreLimpio);
            if (eq) {
                let torneoAbreviado = torneo
                    .replace("Torneo Inicial", "Inicial")
                    .replace("Torneo Final", "Final")
                    .replace("Torneo de Transicion", "Transición")
                    .replace("Torneo de Transición", "Transición")
                    .replace("Temporada", "Temp.")
                    .replace("Campeonato de Primera Division", "Camp.")
                    .replace("Campeonato de Primera División", "Camp.");
                
                historial.push({
                    etiqueta: `${torneoAbreviado} (F${f})`,
                    posicion: eq.posicion
                });
            }
        }
    }
    
    if (miGrafico) {
        miGrafico.destroy();
    }
    
    let ctx = document.getElementById('canvasGrafico').getContext('2d');
    miGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historial.map(h => h.etiqueta),
            datasets: [{
                label: 'Posición histórica',
                data: historial.map(h => h.posicion),
                borderColor: '#00285e',
                backgroundColor: 'rgba(0, 40, 94, 0.1)',
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: '#00285e',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true, 
                    min: 1,
                    ticks: {
                        precision: 0 
                    },
                    title: {
                        display: true,
                        text: 'Puesto en el Ranking'
                    }
                },
                x: {
                    grid: {
                        display: false 
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function actualizarDesplegableFechas(torneoSeleccionado) {
    const selectorFecha = document.getElementById("selectorFecha");
    selectorFecha.innerHTML = ""; 
    
    let totalFechas = fechasPorTorneo[torneoSeleccionado] || 0;
    
    let optionCero = document.createElement("option");
    optionCero.value = 0;
    optionCero.text = "Inicio del Torneo";
    selectorFecha.appendChild(optionCero);

    for(let i = 1; i <= totalFechas; i++) {
        let option = document.createElement("option");
        option.value = i;
        option.text = `Fecha ${i}`;
        selectorFecha.appendChild(option);
    }
    selectorFecha.value = totalFechas;
}

async function iniciarApp() {
    try {
        datosPartidos = await leerCSV("partidos.csv");

        let colTorneo = datosPartidos[0].Torneo !== undefined ? 'Torneo' : 'torneo';
        torneosOrdenados = [...new Set(datosPartidos.map(p => (p[colTorneo] || "").trim()).filter(t => t !== ""))];
        
        if (torneosOrdenados.length === 0) throw new Error("No se encontraron torneos en el CSV.");

        let colFecha = datosPartidos[0].Fecha_del_Torneo !== undefined ? 'Fecha_del_Torneo' : 'fecha_del_torneo';
        
        // NUEVO PASO DE PREPARACIÓN: Contamos cuántos partidos se juegan en cada torneo y fecha
        partidosPorFechaYTorneo = {};
        datosPartidos.forEach(p => {
            let t = (p[colTorneo] || "").trim();
            let f = Number(p[colFecha]);
            if (t && !isNaN(f)) {
                let clave = `${t}|${f}`;
                partidosPorFechaYTorneo[clave] = (partidosPorFechaYTorneo[clave] || 0) + 1;
            }
        });

        torneosOrdenados.forEach(torneo => {
            let partidosDeEsteTorneo = datosPartidos.filter(p => (p[colTorneo] || "").trim() === torneo);
            let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(p[colFecha])))];
            let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
            fechasPorTorneo[torneo] = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;
        });

        const selectorTorneo = document.getElementById("selectorTorneo");
        torneosOrdenados.forEach(torneo => {
            let option = document.createElement("option");
            option.value = torneo;
            option.text = torneo;
            selectorTorneo.appendChild(option);
        });

        const selectorFecha = document.getElementById("selectorFecha");

        selectorTorneo.addEventListener("change", (e) => {
            let torneoSeleccionado = e.target.value;
            actualizarDesplegableFechas(torneoSeleccionado);
            renderizarTabla(torneoSeleccionado, Number(selectorFecha.value));
        });

        selectorFecha.addEventListener("change", (e) => {
            renderizarTabla(selectorTorneo.value, Number(e.target.value));
        });

        const nota = document.createElement("div");
        nota.innerHTML = "<p style='font-size:12px; color:#666; text-align:center; margin-top:20px; font-style:italic;'>Metodología: Sistema Elo Internacional (K=25 variable). Incluye ventaja de localía, multiplicador por diferencia de gol, importancia de playoffs y regresión a la media.</p>";
        document.querySelector(".contenedor").appendChild(nota);

        let torneoInicial = torneosOrdenados[torneosOrdenados.length - 1];
        selectorTorneo.value = torneoInicial;
        actualizarDesplegableFechas(torneoInicial);
        renderizarTabla(torneoInicial, Number(selectorFecha.value));

        const modal = document.getElementById("modalGrafico");
        const spanCerrar = document.querySelector(".cerrar-modal");
        
        spanCerrar.onclick = () => { modal.style.display = "none"; };
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };

    } catch (error) {
        console.error(error);
        document.body.innerHTML += `
            <div style="color: red; padding: 15px; border: 1px solid red; margin: 20px;">
                <strong>Falla crítica:</strong> ${error.message}
            </div>
        `;
    }
}

iniciarApp();
