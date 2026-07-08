let datosPartidos = [];
let datosEquipos = [];
let torneosOrdenados = []; 
let fechasPorTorneo = {}; 
let equiposNoEncontrados = new Set(); 

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
    return nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

// Nueva función de cálculo que procesa hasta un Torneo y Fecha específicos
function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let diccionarioEquipos = {};
    
    datosEquipos.forEach(e => {
        let nombreOriginal = e.Equipo || e.equipo || e.EQUIPO;
        if (nombreOriginal) {
            let nombreLimpio = normalizarNombre(nombreOriginal);
            diccionarioEquipos[nombreLimpio] = { 
                nombre: nombreOriginal.trim(), 
                puntos: 1500 
            };
        }
    });

    let indiceTorneoObjetivo = torneosOrdenados.indexOf(torneoObjetivo);

    datosPartidos.forEach(partido => {
        let nombreTorneo = (partido.Torneo || "").trim();
        let indiceEsteTorneo = torneosOrdenados.indexOf(nombreTorneo);
        
        let colFecha = partido.Fecha_del_Torneo || partido.fecha_del_torneo;
        let fechaDelPartido = Number(colFecha);
        
        let procesar = false;

        // Si el torneo es anterior al seleccionado, procesamos todos sus partidos
        if (indiceEsteTorneo < indiceTorneoObjetivo) {
            procesar = true;
        } 
        // Si es el torneo actual, procesamos solo hasta la fecha seleccionada
        else if (indiceEsteTorneo === indiceTorneoObjetivo) {
            if (fechaDelPartido <= fechaObjetivo) procesar = true;
        }

        if (procesar) {
            let local = diccionarioEquipos[normalizarNombre(partido.Local || partido.local)];
            let visitante = diccionarioEquipos[normalizarNombre(partido.Visitante || partido.visitante)];

            if (local && visitante) {
                let golesLocal = Number(partido.Goles_Local || partido.goles_local);
                let golesVisitante = Number(partido.Goles_Visitante || partido.goles_visitante);
                
                let resultado = (golesLocal > golesVisitante) ? 1 : (golesLocal < golesVisitante ? 0 : 0.5);
                actualizarPuntos(local, visitante, resultado);
            } else {
                if (!local) equiposNoEncontrados.add(partido.Local);
                if (!visitante) equiposNoEncontrados.add(partido.Visitante);
            }
        }
    });

    let ranking = Object.values(diccionarioEquipos);
    ranking.sort((a, b) => b.puntos - a.puntos);
    ranking.forEach((eq, index) => eq.posicion = index + 1);

    return ranking;
}

function renderizarTabla(torneoSeleccionado, fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";
    equiposNoEncontrados.clear(); 

    let rankingActual = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada);
    
    // Para comparar, buscamos la tabla de la "fecha anterior". 
    // Si es la fecha 0 o 1, la comparación real depende del torneo, pero para simplificar visualmente
    // comparamos con la fecha inmediatamente anterior del mismo torneo.
    let rankingAnterior = calcularRankingHasta(torneoSeleccionado, fechaSeleccionada - 1);
    
    // Alertas de equipos no encontrados
    const contenedorAlertas = document.getElementById("alertas");
    if (equiposNoEncontrados.size > 0 && contenedorAlertas) {
        contenedorAlertas.innerHTML = `<div style="background:#ffcccc; color:#a00; padding:10px; margin-bottom:15px; border-radius:5px;">
            <strong>⚠️ Faltan estos equipos en equipos.csv:</strong><br>
            ${Array.from(equiposNoEncontrados).join(', ')}
        </div>`;
    } else if (contenedorAlertas) {
        contenedorAlertas.innerHTML = "";
    }
    
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
        if (fechaSeleccionada === 0) iconoPos = `<span class="igual">-</span>`;

        let textoPts = `<span class="igual">0.00</span>`;
        if (difPuntos > 0.01) textoPts = `<span class="sube">+${difPuntos.toFixed(2)}</span>`;
        else if (difPuntos < -0.01) textoPts = `<span class="baja">${difPuntos.toFixed(2)}</span>`;
        if (fechaSeleccionada === 0) textoPts = `<span class="igual">-</span>`;

        tabla.innerHTML += `
        <tr>
            <td><strong>${equipo.posicion}</strong></td>
            <td>${iconoPos}</td>
            <td class="equipo-nombre">${equipo.nombre}</td>
            <td class="puntos-totales">${Math.round(equipo.puntos)}</td>
            <td>${textoPts}</td>
        </tr>
        `;
    });
}

function actualizarDesplegableFechas(torneoSeleccionado) {
    const selectorFecha = document.getElementById("selectorFecha");
    selectorFecha.innerHTML = ""; // Limpiar fechas viejas
    
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
    // Seleccionar por defecto la última fecha del torneo
    selectorFecha.value = totalFechas;
}

async function iniciarApp() {
    try {
        datosEquipos = await leerCSV("equipos.csv");
        // ATENCIÓN ACÁ: Cambié el nombre para que pongas todos tus torneos en un solo archivo
        datosPartidos = await leerCSV("partidos.csv");

        const tablaDOM = document.getElementById("tablaRanking");
        const divAlertas = document.createElement("div");
        divAlertas.id = "alertas";
        tablaDOM.parentNode.insertBefore(divAlertas, tablaDOM);

        // Extraer todos los torneos en orden de aparición en el CSV
        torneosOrdenados = [...new Set(datosPartidos.map(p => (p.Torneo || "").trim()).filter(t => t !== ""))];
        
        if (torneosOrdenados.length === 0) throw new Error("No se encontraron torneos en el CSV.");

        // Calcular la cantidad de fechas por cada torneo
        let colFecha = datosPartidos[0].Fecha_del_Torneo !== undefined ? 'Fecha_del_Torneo' : 'fecha_del_torneo';
        
        torneosOrdenados.forEach(torneo => {
            let partidosDeEsteTorneo = datosPartidos.filter(p => (p.Torneo || "").trim() === torneo);
            let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(p[colFecha])))];
            let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
            fechasPorTorneo[torneo] = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;
        });

        // Llenar el desplegable de Torneos
        const selectorTorneo = document.getElementById("selectorTorneo");
        torneosOrdenados.forEach(torneo => {
            let option = document.createElement("option");
            option.value = torneo;
            option.text = torneo;
            selectorTorneo.appendChild(option);
        });

        // Eventos para actualizar todo cuando se cambia algo
        const selectorFecha = document.getElementById("selectorFecha");

        selectorTorneo.addEventListener("change", (e) => {
            let torneoSeleccionado = e.target.value;
            actualizarDesplegableFechas(torneoSeleccionado);
            renderizarTabla(torneoSeleccionado, Number(selectorFecha.value));
        });

        selectorFecha.addEventListener("change", (e) => {
            renderizarTabla(selectorTorneo.value, Number(e.target.value));
        });

        // Inicializar la vista con el primer torneo que aparezca
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
