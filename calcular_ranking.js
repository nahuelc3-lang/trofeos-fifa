async function leerCSV(archivo) {
    const respuesta = await fetch(archivo);
    
    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${archivo}. Estado: ${respuesta.status}`);
    }
    
    const texto = await respuesta.text();
    
    // CORRECCIÓN CLAVE: 
    // Separamos usando saltos de línea (soportando Windows \r\n y Mac/Linux \n)
    // Y filtramos (eliminamos) automáticamente cualquier línea que esté vacía
    const filas = texto.trim().split(/\r?\n/).filter(fila => fila.trim() !== "");
    
    // Si el archivo está vacío, devolvemos un arreglo vacío para no romper el código
    if (filas.length === 0) return []; 

    const columnas = filas[0].split(",");

    return filas.slice(1).map(fila => {
        const valores = fila.split(",");
        let objeto = {};

        columnas.forEach((columna, i) => {
            if (columna) {
                // Si hay un valor, le hacemos trim, sino lo dejamos vacío
                objeto[columna.trim()] = valores[i] ? valores[i].trim() : "";
            }
        });

        return objeto;
    });
}


// Fórmula estilo FIFA/Elo
function calcularResultadoEsperado(puntosA, puntosB) {
    return 1 / (1 + Math.pow(10, (puntosB - puntosA) / 400));
}


// Actualización de puntos
function actualizarPuntos(equipoA, equipoB, resultadoA) {
    const K = 40;
    const esperadoA = calcularResultadoEsperado(equipoA.puntos, equipoB.puntos);
    const cambio = K * (resultadoA - esperadoA);

    equipoA.puntos += cambio;
    equipoB.puntos -= cambio;
}


// Función principal
async function generarRanking() {
    try {
        const equiposCSV = await leerCSV("equipos.csv");
        const partidos = await leerCSV("torneo_inicial_2012.csv");

        // Crear ranking inicial
        let equipos = {};

        equiposCSV.forEach(e => {
            // Soportamos "Equipo" o "equipo" por si en el futuro cambias el CSV
            let nombreEquipo = e.Equipo || e.equipo;
            if(nombreEquipo) {
                equipos[nombreEquipo] = {
                    nombre: nombreEquipo,
                    puntos: 1500
                };
            }
        });

        // Procesar partidos
        partidos.forEach(partido => {
            let local = equipos[partido.Local];
            let visitante = equipos[partido.Visitante];

            // Si algún equipo está mal escrito en el CSV de partidos, lo salta y te avisa en consola
            if(!local || !visitante){
                console.warn(`Partido ignorado (Equipo no encontrado): ${partido.Local} vs ${partido.Visitante}`);
                return; 
            }

            let golesLocal = Number(partido.Goles_Local);
            let golesVisitante = Number(partido.Goles_Visitante);
            let resultado;

            if(golesLocal > golesVisitante){
                resultado = 1; // Gana local
            } 
            else if(golesLocal < golesVisitante){
                resultado = 0; // Gana visitante
            }
            else {
                resultado = 0.5; // Empate
            }

            actualizarPuntos(local, visitante, resultado);
        });

        // Convertir el diccionario a tabla y ordenar por puntos de mayor a menor
        let ranking = Object.values(equipos);
        ranking.sort((a, b) => b.puntos - a.puntos);

        mostrarRanking(ranking);

    } catch (error) {
        console.error(error);
        // Ahora si hay error, te va a decir exactamente en qué línea falló (error.stack)
        document.body.innerHTML += `
            <div style="color: red; border: 1px solid red; padding: 15px; background: #ffe6e6; margin-top: 20px;">
                <h2>Error cargando los datos</h2>
                <p><strong>Mensaje:</strong> ${error.message}</p>
                <p style="font-size: 12px; color: #555;">${error.stack}</p>
            </div>
        `;
    }
}


// Mostrar datos en el HTML
function mostrarRanking(ranking){
    const tabla = document.querySelector("#tablaRanking tbody");
    tabla.innerHTML = "";

    ranking.forEach((equipo, index) => {
        tabla.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${equipo.nombre}</td>
            <td><strong>${Math.round(equipo.puntos)}</strong></td>
        </tr>
        `;
    });
}

// Ejecutamos la función
generarRanking();
