let datosPartidos = [];
let torneosOrdenados = []; 
let fechasPorTorneo = {}; 

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
        'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã‘': 'Ñ',
        'ã¡': 'á', 'ã©': 'é', 'ã­': 'í', 'ã³': 'ó', 'ãº': 'ú', 'ã±': 'ñ'
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

// NUEVO MOTOR MATEMÁTICO: Localía, Margen de Gol y K=25
function actualizarPuntos(equipoLocal, equipoVisitante, golesLocal, golesVisitante) {
    let puntosL = equipoLocal.puntos;
    let puntosV = equipoVisitante.puntos;

    // 1. Ventaja de Localía (+75 puntos virtuales solo para el cálculo)
    const VENTAJA_LOCAL = 75;
    let ptosLocalVirtual = puntosL + VENTAJA_LOCAL;

    // 2. Probabilidad Esperada
    let esperadoLocal = 1 / (1 + Math.pow(10, (puntosV - ptosLocalVirtual) / 400));
    let esperadoVisitante = 1 - esperadoLocal;

    // 3. Determinar Resultado
    let resultadoLocal, resultadoVisitante;
    if (golesLocal > golesVisitante) { resultadoLocal = 1; resultadoVisitante = 0; }
    else if (golesLocal < golesVisitante) { resultadoLocal = 0; resultadoVisitante = 1; }
    else { resultadoLocal = 0.5; resultadoVisitante = 0.5; }

    // 4. Multiplicador por Margen de Goles (G)
    let difGoles = Math.abs(golesLocal - golesVisitante);
    let G = 1;
    
    if (resultadoLocal !== 0.5) { // Si no es empate
        // Diferencia de rating a favor del ganador
        let difPuntos = (resultadoLocal === 1) ? (ptosLocalVirtual - puntosV) : (puntosV - ptosLocalVirtual);
        // Fórmula logarítmica estándar para el fútbol
        G = Math.log(difGoles + 1) * (2 / (2 + 0.001 * difPuntos));
        if (G < 1) G = 1; // El multiplicador nunca achica los puntos base
    }

    // 5. Aplicar K base de 25
    const K = 25;
    let cambio = K * G * (resultadoLocal - esperadoLocal); // Fórmula Elo final

    equipoLocal.puntos += cambio;
    equipoVisitante.puntos -= cambio;
}

// NUEVA LÓGICA HISTÓRICA: Regresión a la media y ascensos dinámicos
function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let diccionarioEquipos = {};
    let indiceTorneoObjetivo = torneosOrdenados.indexOf(torneoObjetivo);

    // Mapa auxiliar para guardar los nombres originales bonitos
    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        nombresOriginales[normalizarNombre(p.Local)] = p.Local.trim();
        nombresOriginales[normalizarNombre(p.Visitante)] = p.Visitante.trim();
    });

    // Procesamos la historia torneo por torneo en orden cronológico
    for (let t = 0; t <= indiceTorneoObjetivo; t++) {
        let nombreTorneoActual = torneosOrdenados[t];
        let partidosDeEsteTorneo = datosPartidos.filter(p => (p.Torneo || "").trim() === nombreTorneoActual);
        
        // Identificar quiénes juegan este torneo
        let equiposEsteTorneo = new Set();
        partidosDeEsteTorneo.forEach(p => {
            equiposEsteTorneo.add(normalizarNombre(p.Local));
            equiposEsteTorneo.add(normalizarNombre(p.Visitante));
        });

        // Calcular el promedio de puntos de la liga al finalizar el torneo anterior
        let sumaPts = 0, cantEquipos = 0;
        if (t > 0) {
            Object.values(diccionarioEquipos).forEach(eq => {
                if (eq.ultimoTorneo === t - 1) { sumaPts += eq.puntos; cantEquipos++; }
            });
        }
        let promedioLiga = cantEquipos > 0 ? (sumaPts / cantEquipos) : 1500;

        // Administrar los puntos iniciales y de receso para los equipos que juegan hoy
        equiposEsteTorneo.forEach(nombreEq => {
            if (!diccionarioEquipos[nombreEq]) {
                // ASCENSO O PRIMER TORNEO: El primer año arrancan en 1500. Después, el ascendido arranca 100 pts abajo del promedio.
                let ptsIniciales = (t === 0) ? 1500 : (promedioLiga - 100);
                diccionarioEquipos[nombreEq] = { 
                    nombre: nombresOriginales[nombreEq], 
                    puntos: ptsIniciales, 
                    ultimoTorneo: t 
                };
            } else {
                // EL EQUIPO YA EXISTÍA EN LA BASE
                if (diccionarioEquipos[nombreEq].ultimoTorneo < t - 1) {
                    // REINGRESO POST DESCENSO: Mezcla su historia (70%) con la realidad actual de la liga (30%)
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.7) + (promedioLiga * 0.3);
                } else if (diccionarioEquipos[nombreEq].ultimoTorneo === t - 1) {
                    // EQUIPO QUE SE MANTIENE: Regresión de mercado (pierde un 5% de su distancia con los 1500 puntos)
                    diccionarioEquipos[nombreEq].puntos = (diccionarioEquipos[nombreEq].puntos * 0.95) + (1500 * 0.05);
                }
                diccionarioEquipos[nombreEq].ultimoTorneo = t;
            }
        });

        // Jugar los partidos
        partidosDeEsteTorneo.forEach(partido => {
            let colFecha = partido.Fecha_del_Torneo || partido.fecha_del_torneo;
            let fechaDelPartido = Number(colFecha);
            
            // Si estamos en el torneo actual, frenamos en la fecha elegida por el usuario
            if (t === indiceTorneoObjetivo && fechaDelPartido > fechaObjetivo) return;

            let local = diccionarioEquipos[normalizarNombre(partido.Local)];
            let visitante = diccionarioEquipos[normalizarNombre(partido.Visitante)];
            let golesLocal = Number(partido.Goles_Local || partido.goles_local);
            let golesVisitante = Number(partido.Goles_Visitante || partido.goles_visitante);
            
            actualizarPuntos(local, visitante, golesLocal, golesVisitante);
        });
    }

    // Filtrar solo a los equipos activos en el torneo objetivo
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
            <td class="equipo-nombre">${equipo.nombre} ${tagAscenso}</td>
            <td class="puntos-totales">${Math.round(equipo.puntos)}</td>
            <td>${textoPts}</td>
        </tr>
        `;
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

        // Insertar nota metodológica al final
        const nota = document.createElement("div");
        nota.innerHTML = "<p style='font-size:12px; color:#666; text-align:center; margin-top:20px; font-style:italic;'>Metodología: Sistema Elo Internacional (K=25 variable). Incluye ventaja de localía, multiplicador por diferencia de gol y regresión a la media.</p>";
        document.querySelector(".contenedor").appendChild(nota);

        let torneoInicial = torneosOrdenados[torneosOrdenados.length - 1];
        selectorTorneo.value = torneoInicial;
        actualizarDesplegableFechas(torneoInicial);
        renderizarTabla(torneoInicial, Number(selectorFecha.value));

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
