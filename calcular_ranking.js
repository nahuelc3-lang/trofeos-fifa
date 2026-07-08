// Variable global para guardar todos los partidos y equipos una vez que cargan
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

// NUEVO: Función que calcula el ranking HASTA una fecha específica
function calcularRankingHastaFecha(fechaLimite) {
    // 1. Inicializamos todos en 1500
    let diccionarioEquipos = {};
    datosEquipos.forEach(e => {
        let nombre = e.Equipo || e.equipo;
        if (nombre) {
            diccionarioEquipos[nombre] = { nombre: nombre, puntos: 1500 };
        }
    });

    // 2. Procesamos solo los partidos que se jugaron hasta la fecha seleccionada
    datosPartidos.forEach(partido => {
        let fechaDelPartido = Number(partido.Fecha_del_Torneo);
        
        if (fechaDelPartido <= fechaLimite) {
            let local = diccionarioEquipos[partido.Local];
            let visitante = diccionarioEquipos[partido.Visitante];

            if (local && visitante) {
                let golesLocal = Number(partido.Goles_Local);
                let golesVisitante = Number(partido.Goles_Visitante);
                let resultado = (golesLocal > golesVisitante) ? 1 : (golesLocal < golesVisitante ? 0 : 0.5);
                
                actualizarPuntos(local, visitante, resultado);
            }
        }
    });

    // 3. Convertimos a arreglo y ordenamos por puntos
    let ranking = Object.values(diccionarioEquipos);
    ranking.sort((a, b) => b.puntos - a.puntos);
    
    // Le asignamos la posición actual a cada uno
    ranking.forEach((eq, index) => eq.posicion = index + 1);

    return ranking;
}

// Procesar y mostrar la tabla comparando fecha actual vs anterior
function renderizarTabla(fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";

    // Obtenemos cómo quedó la tabla en la fecha seleccionada
    let rankingActual = calcularRankingHastaFecha(fechaSeleccionada);
    
    // Obtenemos cómo estaba la tabla en la fecha ANTERIOR para comparar
    let rankingAnterior = calcularRankingHastaFecha(fechaSeleccionada - 1);
    
    // Convertimos el ranking anterior en un diccionario para buscar rápido por nombre
    let mapaAnterior = {};
    rankingAnterior.forEach(eq => {
        mapaAnterior[eq.nombre] = { posicion: eq.posicion, puntos: eq.puntos };
    });

    // Dibujamos el HTML
    rankingActual.forEach((equipo) => {
        let datosAyer = mapaAnterior[equipo.nombre];
        
        // Cálculos de variación
        let difPosicion = datosAyer.posicion - equipo.posicion; 
        let difPuntos = equipo.puntos - datosAyer.puntos;

        // Estilos para flechas de posición
        let iconoPos = `<span class="igual">-</span>`;
        if (difPosicion > 0) iconoPos = `<span class="sube">▲ ${difPosicion}</span>`;
        if (difPosicion < 0) iconoPos = `<span class="baja">▼ ${Math.abs(difPosicion)}</span>`;
        
        // No mostrar variación si estamos en la fecha 0 (inicio)
        if (fechaSeleccionada === 0) iconoPos = `<span class="igual">-</span>`;

        // Estilos para puntos sumados/restados
        let textoPts = `<span class="igual">0.00</span>`;
        if (difPuntos > 0) textoPts = `<span class="sube">+${difPuntos.toFixed(2)}</span>`;
        if (difPuntos < 0) textoPts = `<span class="baja">${difPuntos.toFixed(2)}</span>`;
        
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

// Función inicializadora
async function iniciarApp() {
    try {
        datosEquipos = await leerCSV("equipos.csv");
        datosPartidos = await leerCSV("torneo_inicial_2012.csv");

        // Identificamos cuántas fechas tiene el torneo buscando el número máximo
        let fechasUnicas = [...new Set(datosPartidos.map(p => Number(p.Fecha_del_Torneo)))];
        let totalFechas = Math.max(...fechasUnicas.filter(n => !isNaN(n)));

        // Llenamos el desplegable del HTML
        const selector = document.getElementById("selectorFecha");
        for(let i = 1; i <= totalFechas; i++) {
            let option = document.createElement("option");
            option.value = i;
            option.text = `Fecha ${i}`;
            selector.appendChild(option);
        }

        // Seleccionamos la última fecha por defecto (para que de entrada se vea el final)
        selector.value = totalFechas;
        
        // Escuchamos cuando el usuario cambia la fecha en el desplegable
        selector.addEventListener("change", (e) => {
            renderizarTabla(Number(e.target.value));
        });

        // Dibujamos la tabla por primera vez
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

// Arrancar
iniciarApp();
