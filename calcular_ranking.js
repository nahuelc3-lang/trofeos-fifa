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

async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${archivo}`);
    
    let texto = await respuesta.text();
    texto = texto.replace(/^\uFEFF/, ''); 
    
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
    
    const mapaErrores = {
        'ã¡': 'a', 'ã©': 'e', 'ã­': 'i', 'ã³': 'o', 'ãº': 'u', 'ã±': 'n',
        'Ã¡': 'a', 'Ã©': 'e', 'Ã­': 'i', 'Ã³': 'o', 'Ãº': 'u', 'Ã±': 'n',
        '': ''
    };
    
    // ACÁ ESTABA EL ERROR: Cambié "en" por "in"
    for (let mal in mapaErrores) {
        limpio = limpio.split(mal).join(mapaErrores[mal]);
    }
    
    limpio = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return aliasEquipos[limpio] || limpio;
}

function calcularResultadoEsperado(puntosA, puntosB) {
    return 1 / (1 + Math.pow(10, (puntosB - puntosA) / 400));
}

function actualizarPuntos(equipoA, equipoB, resultadoA) {
    const K = 40;
    const esperadoA = calcularResultadoEsperado(equipoA.puntos, equipoB.puntos);
    const cambio = K * (resultadoA - esperadoA);
    equipoA.puntos += cambio;
    equipoB.puntos -= cambio;
}

function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let diccionarioEquipos = {};
    let indiceTorneoObjetivo = torneosOrdenados.indexOf(torneoObjetivo);

    datosPartidos.forEach(partido => {
        let nombreTorneo = (partido.Torneo || "").trim();
        let indiceEsteTorneo = torneosOrdenados.indexOf(nombreTorneo);

        if (indiceEsteTorneo <= indiceTorneoObjetivo) {
            let nombreLocalLimpio = normalizarNombre(partido.Local);
            let nombreVisitanteLimpio = normalizarNombre(partido.Visitante);

            if (!diccionarioEquipos[nombreLocalLimpio]) {
                diccionarioEquipos[nombreLocalLimpio] = { nombre: (partido.Local).trim(), puntos: 1500, ultimoTorneo: indiceEsteTorneo };
            } else {
                diccionarioEquipos[nombreLocalLimpio].ultimoTorneo = indiceEsteTorneo;
            }

            if (!diccionarioEquipos[nombreVisitanteLimpio]) {
                diccionarioEquipos[nombreVisitanteLimpio] = { nombre: (partido.Visitante).trim(), puntos: 1500, ultimoTorneo: indiceEsteTorneo };
            } else {
                diccionarioEquipos[nombreVisitanteLimpio].ultimoTorneo = indiceEsteTorneo;
            }
        }
    });

    datosPartidos.forEach(partido => {
        let nombreTorneo = (partido.Torneo || "").trim();
        let indiceEsteTorneo = torneosOrdenados.indexOf(nombreTorneo);
        let colFecha = partido.Fecha_del_Torneo || partido.fecha_del_torneo;
        let fechaDelPartido = Number(colFecha);
        
        let procesar = false;

        if (indiceEsteTorneo < indiceTorneoObjetivo) {
            procesar = true;
        } else if (indiceEsteTorneo === indiceTorneoObjetivo && fechaDelPartido <= fechaObjetivo) {
            procesar = true;
        }

        if (procesar) {
            let local = diccionarioEquipos[normalizarNombre(partido.Local)];
            let visitante = diccionarioEquipos[normalizarNombre(partido.Visitante)];

            let golesLocal = Number(partido.Goles_Local || partido.goles_local);
            let golesVisitante = Number(partido.Goles_Visitante || partido.goles_visitante);
            
            let resultado = (golesLocal > golesVisitante) ? 1 : (golesLocal < golesVisitante ? 0 : 0.5);
            actualizarPuntos(local, visitante, resultado);
        }
    });

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
        datosPartidos = await leerCSV("partidos.csv"); // ASUMO QUE EL ARCHIVO ESTÁ COMO partidos.csv

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

        let torneoInicial = torneosOrdenados[0];
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
