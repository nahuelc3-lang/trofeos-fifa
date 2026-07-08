let datosPartidos = [];
let datosEquipos = [];
let equiposNoEncontrados = new Set(); // Para avisar en pantalla si falta alguno

async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${archivo}`);
    
    let texto = await respuesta.text();
    
    // MAGIA 1: Limpiamos la basura invisible que a veces dejan los editores de texto (BOM)
    texto = texto.replace(/^\uFEFF/, '');
    
    const filas = texto.trim().split(/\r?\n/).filter(fila => fila.trim() !== "");
    if (filas.length === 0) return []; 

    // MAGIA 2: Detecta solo si el CSV usó coma (,) o punto y coma (;)
    const separador = filas[0].includes(";") ? ";" : ",";
    
    // Limpiamos los títulos de posibles comillas
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

// MAGIA 3: Borra tildes, mayúsculas y espacios extra para que todo coincida siempre
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

function calcularRankingHastaFecha(fechaLimite) {
    let diccionarioEquipos = {};
    
    // Todos arrancan en 1500
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

    datosPartidos.forEach(partido => {
        // Soporte por si la columna se puso en minúsculas
        let colFecha = partido.Fecha_del_Torneo || partido.fecha_del_torneo;
        let fechaDelPartido = Number(colFecha);
        
        if (fechaDelPartido <= fechaLimite) {
            let nombreLocalLimpio = normalizarNombre(partido.Local || partido.local);
            let nombreVisitanteLimpio = normalizarNombre(partido.Visitante || partido.visitante);
            
            let local = diccionarioEquipos[nombreLocalLimpio];
            let visitante = diccionarioEquipos[nombreVisitanteLimpio];

            if (local && visitante) {
                let golesLocal = Number(partido.Goles_Local || partido.goles_local);
                let golesVisitante = Number(partido.Goles_Visitante || partido.goles_visitante);
                
                let resultado;
                if(golesLocal > golesVisitante) resultado = 1; 
                else if(golesLocal < golesVisitante) resultado = 0;
                else resultado = 0.5;
                
                actualizarPuntos(local, visitante, resultado);
            } else {
                // Si a pesar de todo un equipo no cruza, lo guardamos para avisarte
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

function renderizarTabla(fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";
    equiposNoEncontrados.clear(); // Limpiamos errores previos

    let rankingActual = calcularRankingHastaFecha(fechaSeleccionada);
    let rankingAnterior = calcularRankingHastaFecha(fechaSeleccionada - 1);
    
    // MAGIA 4: Si hay un error de tipeo insalvable en el CSV, te lo muestra arriba de la tabla
    const contenedorAlertas = document.getElementById("alertas");
    if (equiposNoEncontrados.size > 0 && contenedorAlertas) {
        contenedorAlertas.innerHTML = `<div style="background:#ffcccc; color:#a00; padding:10px; margin-bottom:15px; border-radius:5px;">
            <strong>⚠️ Atención:</strong> Estos equipos están en los partidos pero no en equipos.csv. Revisá si no sobran espacios o palabras:<br>
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
        
        let difPosicion = datosAyer.posicion - equipo.posicion; 
        let difPuntos = equipo.puntos - datosAyer.puntos;

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

async function iniciarApp() {
    try {
        datosEquipos = await leerCSV("equipos.csv");
        datosPartidos = await leerCSV("torneo_inicial_2012.csv");

        // Creamos la caja para las alertas visuales
        const tablaDOM = document.getElementById("tablaRanking");
        const divAlertas = document.createElement("div");
        divAlertas.id = "alertas";
        tablaDOM.parentNode.insertBefore(divAlertas, tablaDOM);

        // Detectamos la columna de fechas
        let colFecha = datosPartidos[0].Fecha_del_Torneo !== undefined ? 'Fecha_del_Torneo' : 'fecha_del_torneo';
        let fechasUnicas = [...new Set(datosPartidos.map(p => Number(p[colFecha])))];
        let fechasValidas = fechasUnicas.filter(n => !isNaN(n) && n > 0);
        
        let totalFechas = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;

        if (totalFechas === 0) {
            throw new Error("No pude encontrar los números de fecha. Revisá que el CSV tenga la columna 'Fecha_del_Torneo' exacta.");
        }

        const selector = document.getElementById("selectorFecha");
        for(let i = 1; i <= totalFechas; i++) {
            let option = document.createElement("option");
            option.value = i;
            option.text = `Fecha ${i}`;
            selector.appendChild(option);
        }

        selector.value = totalFechas;
        selector.addEventListener("change", (e) => renderizarTabla(Number(e.target.value)));

        renderizarTabla(totalFechas);

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
