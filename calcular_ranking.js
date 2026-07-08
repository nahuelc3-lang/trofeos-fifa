let datosPartidos = [];
let datosEquipos = [];

async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${archivo}`);
    
    const buffer = await respuesta.arrayBuffer();
    const texto = new TextDecoder("windows-1252").decode(buffer);
    
    const filas = texto.trim().split(/\r?\n/).filter(fila => fila.trim() !== "");
    if (filas.length === 0) return []; 

    const columnas = filas[0].split(",");

    return filas.slice(1).map(fila => {
        const valores = fila.split(",");
        let objeto = {};
        columnas.forEach((columna, i) => {
            if (columna) objeto[columna.trim()] = valores[i] ? valores[i].trim() : "";
        });
        return objeto;
    });
}

// NUEVO: Función "Mágica" que borra tildes, mayúsculas y espacios extra
// Sirve para que "Colón" y "Colon" sean idénticos para la computadora
function normalizarNombre(nombre) {
    if (!nombre) return "";
    return nombre
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Expresión que elimina los acentos
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
    
    // ARRANCAN TODOS EN 1500 PUNTOS
    datosEquipos.forEach(e => {
        let nombreOriginal = e.Equipo || e.equipo;
        if (nombreOriginal) {
            // Guardamos el equipo usando su nombre "limpio" como llave de búsqueda
            let nombreLimpio = normalizarNombre(nombreOriginal);
            diccionarioEquipos[nombreLimpio] = { 
                nombre: nombreOriginal.trim(), // Guardamos el original para que se vea lindo en la tabla
                puntos: 1500 
            };
        }
    });

    datosPartidos.forEach(partido => {
        let fechaDelPartido = Number(partido.Fecha_del_Torneo);
        
        if (fechaDelPartido <= fechaLimite) {
            // Buscamos a los equipos usando sus nombres "limpios"
            let nombreLocalLimpio = normalizarNombre(partido.Local);
            let nombreVisitanteLimpio = normalizarNombre(partido.Visitante);
            
            let local = diccionarioEquipos[nombreLocalLimpio];
            let visitante = diccionarioEquipos[nombreVisitanteLimpio];

            if (local && visitante) {
                let golesLocal = Number(partido.Goles_Local);
                let golesVisitante = Number(partido.Goles_Visitante);
                
                let resultado;
                if(golesLocal > golesVisitante) resultado = 1; 
                else if(golesLocal < golesVisitante) resultado = 0;
                else resultado = 0.5;
                
                actualizarPuntos(local, visitante, resultado);
            } else {
                console.warn(`Partido ignorado: No se encontró a ${partido.Local} o ${partido.Visitante}. Revisar diferencias graves (ej: Independiente vs CA Independiente).`);
            }
        }
    });

    let ranking = Object.values(diccionarioEquipos);
    // Ordenamos por puntos de mayor a menor
    ranking.sort((a, b) => b.puntos - a.puntos);
    ranking.forEach((eq, index) => eq.posicion = index + 1);

    return ranking;
}

function renderizarTabla(fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";

    let rankingActual = calcularRankingHastaFecha(fechaSeleccionada);
    let rankingAnterior = calcularRankingHastaFecha(fechaSeleccionada - 1);
    
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

        let fechasUnicas = [...new Set(datosPartidos.map(p => Number(p.Fecha_del_Torneo)))];
        let totalFechas = Math.max(...fechasUnicas.filter(n => !isNaN(n)));

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
                Error: ${error.message}
            </div>
        `;
    }
}

iniciarApp();
