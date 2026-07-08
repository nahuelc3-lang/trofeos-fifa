async function leerCSV(archivo) {

    const respuesta = await fetch(archivo);
    const texto = await respuesta.text();

    const filas = texto.trim().split("\n");

    const columnas = filas[0].split(",");

    return filas.slice(1).map(fila => {

        const valores = fila.split(",");

        let objeto = {};

        columnas.forEach((columna, i) => {
            objeto[columna.trim()] = valores[i]?.trim();
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

    const esperadoA = calcularResultadoEsperado(
        equipoA.puntos,
        equipoB.puntos
    );


    const cambio = K * (resultadoA - esperadoA);


    equipoA.puntos += cambio;
    equipoB.puntos -= cambio;

}


// Función principal

async function generarRanking() {


    const equiposCSV = await leerCSV("equipos.csv");

    const partidos = await leerCSV("torneo_inicial_2012.csv");


    // Crear ranking inicial

    let equipos = {};

    equiposCSV.forEach(e => {

        equipos[e.equipo] = {

            nombre: e.equipo,
            puntos: 1500

        };

    });



    // Procesar partidos

    partidos.forEach(partido => {


        let local = equipos[partido.Local];
        let visitante = equipos[partido.Visitante];


        if(!local || !visitante){

            console.log(
                "Equipo no encontrado:",
                partido.Local,
                partido.Visitante
            );

            return;

        }


        let golesLocal = Number(partido.Goles_Local);
        let golesVisitante = Number(partido.Goles_Visitante);



        let resultado;


        if(golesLocal > golesVisitante){

            resultado = 1;

        } 
        else if(golesLocal < golesVisitante){

            resultado = 0;

        }
        else {

            resultado = 0.5;

        }



        actualizarPuntos(
            local,
            visitante,
            resultado
        );


    });



    // Convertir a tabla

    let ranking = Object.values(equipos);


    ranking.sort(
        (a,b)=> b.puntos - a.puntos
    );



    mostrarRanking(ranking);

}




function mostrarRanking(ranking){


    const tabla = document.querySelector("#tablaRanking tbody");


    tabla.innerHTML = "";


    ranking.forEach((equipo,index)=>{


        tabla.innerHTML += `

        <tr>

        <td>${index+1}</td>

        <td>${equipo.nombre}</td>

        <td>${equipo.puntos.toFixed(2)}</td>

        </tr>

        `;


    });


}



generarRanking();
