let datosPartidos = [];
let torneosOrdenados = []; 
let fechasPorTorneo = {}; 
let partidosPorFechaYTorneo = {}; 
let miGrafico = null; 

// Base de Datos en Caché del recorrido histórico de cada club
let cacheHistorialGlobal = {}; 

// Variables de estado del modal actual
let clubSeleccionadoActivo = "";
let filtroTipoActivo = "torneo"; // "torneo" o "tiempo"
let filtroValorActivo = "ultimo"; // "ultimo", "2", "5", "todo", "1año", "2años", "5años"
let modoMetricaActivo = "posicion"; // "posicion" o "elo"

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
        'ã¡': 'á', 'ã©': 'é', 'ã­': 'í', 'ã³': 'ó', 'ãº': 'ú', 'ãñ': 'ñ'
    };
    let resultado = texto;
    for (let mal in mapa) {
        resultado = resultado.split(mal).join(mapa[mal]);
    }
    return resultado;
}

function obtenerCampo(objeto, campo) {
    if (!objeto) return "";
    const campoLower = campo.toLowerCase().trim();
    if (objeto[campo] !== undefined) return objeto[campo];
    for (let k in objeto) {
        if (k.toLowerCase().trim() === campoLower) {
            return objeto[k];
        }
    }
    return "";
}

function parsearFechaStr(fechaStr) {
    if (!fechaStr) return new Date();
    let partes = fechaStr.split('/');
    if (partes.length === 3) {
        // Formato DD/MM/YYYY
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }
    return new Date(fechaStr);
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

function obtenerMultiplicadorInstancia(torneo, fecha) {
    let clave = `${torneo.trim()}|${fecha}`;
    let cantPartidos = partidosPorFechaYTorneo[clave] || 10;

    if (cantPartidos === 1) return 2.0; 
    if (cantPartidos === 2) return 1.6; 
    if (cantPartidos === 4) return 1.3; 
    if (cantPartidos === 8) return 1.1; 
    return 1.0; 
}

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
        let denominador = 2 + 0.001 * difPuntos;
        if (denominador <= 0.1) denominador = 0.1;

        G = Math.log(difGoles + 1) * (2 / denominador);
        if (G < 1) G = 1; 
    }

    const K_BASE = 25;
    const pesoInstancia = obtenerMultiplicadorInstancia(torneo, fecha);
    
    let cambio = K_BASE * pesoInstancia * G * (resultadoLocal - esperadoLocal); 

    equipoLocal.puntos += cambio;
    equipoVisitante.puntos -= cambio;
}

// -------------------------------------------------------------------------
// REVOLUCIONARIO MOTOR DE PRECALCULO (Un solo bucle de alta velocidad)
// -------------------------------------------------------------------------
function precalcularHistorialCompleto() {
    cacheHistorialGlobal = {};
    let diccionarioEquipos = {};

    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        let loc = obtenerCampo(p, 'Local').trim();
        let vis = obtenerCampo(p, 'Visitante').trim();
        if (loc) nombresOriginales[normalizarNombre(loc)] = loc;
        if (vis) nombresOriginales[normalizarNombre(vis)] = vis;
    });

    for (let t = 0; t < torneosOrdenados.length; t++) {
        let nombreTorneoActual = torneosOrdenados[t];
        let partidosDeEsteTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === nombreTorneoActual);
        
        let equiposEsteTorneo = new Set();
        partidosDeEsteTorneo.forEach(p => {
            let loc = obtenerCampo(p, 'Local');
            let vis = obtenerCampo(p, 'Visitante');
            if (loc) equiposEsteTorneo.add(normalizarNombre(loc));
            if (vis) equiposEsteTorneo.add(normalizarNombre(vis));
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

        let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
        let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
        let maxFechas = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;

        // Registro Fecha 0 (Inicio)
        let activeTeams = Array.from(equiposEsteTorneo);
        let rankingTemp = activeTeams.map(nameNorm => ({
            nameNorm: nameNorm,
            puntos: diccionarioEquipos[nameNorm].puntos
        })).sort((a,b) => b.puntos - a.puntos);
        
        let posMap = {};
        rankingTemp.forEach((item, idx) => { posMap[item.nameNorm] = idx + 1; });

        activeTeams.forEach(nameNorm => {
            if (!cacheHistorialGlobal[nameNorm]) cacheHistorialGlobal[nameNorm] = [];
            cacheHistorialGlobal[nameNorm].push({
                torneo: nombreTorneoActual,
                fecha: 0,
                puntos: diccionarioEquipos[nameNorm].puntos,
                posicion: posMap[nameNorm],
                rival: "",
                resultado: "",
                score: "",
                variacion: 0,
                fechaReal: parsearFechaStr(obtenerCampo(partidosDeEsteTorneo[0], 'Fecha'))
            });
        });

        // Simular Fecha por Fecha
        for (let f = 1; f <= maxFechas; f++) {
            let partidosFecha = partidosDeEsteTorneo.filter(p => Number(obtenerCampo(p, 'Fecha_del_Torneo')) === f);
            
            let puntosPrevios = {};
            activeTeams.forEach(nameNorm => {
                puntosPrevios[nameNorm] = diccionarioEquipos[nameNorm].puntos;
            });

            let matchDetails = {};
            activeTeams.forEach(nameNorm => {
                matchDetails[nameNorm] = { rival: "", resultado: "", score: "", fechaReal: null };
            });

            partidosFecha.forEach(partido => {
                let locName = obtenerCampo(partido, 'Local');
                let visName = obtenerCampo(partido, 'Visitante');
                let nameLocNorm = normalizarNombre(locName);
                let nameVisNorm = normalizarNombre(visName);

                let local = diccionarioEquipos[nameLocNorm];
                let visitante = diccionarioEquipos[nameVisNorm];
                let golesLocal = Number(obtenerCampo(partido, 'Goles_Local'));
                let golesVisitante = Number(obtenerCampo(partido, 'Goles_Visitante'));

                if (local && visitante) {
                    actualizarPuntos(local, visitante, golesLocal, golesVisitante, nombreTorneoActual, f);
                    
                    let resLoc = golesLocal > golesVisitante ? "Ganó" : (golesLocal < golesVisitante ? "Perdió" : "Empató");
                    let resVis = golesVisitante > golesLocal ? "Ganó" : (golesVisitante < golesLocal ? "Perdió" : "Empató");
                    
                    let fReal = parsearFechaStr(obtenerCampo(partido, 'Fecha'));

                    matchDetails[nameLocNorm] = {
                        rival: visitante.nombre,
                        resultado: resLoc,
                        score: `${golesLocal}-${golesVisitante}`,
                        fechaReal: fReal
                    };
                    matchDetails[nameVisNorm] = {
                        rival: local.nombre,
                        resultado: resVis,
                        score: `${golesVisitante}-${golesLocal}`,
                        fechaReal: fReal
                    };
                }
            });

            let rankingF = activeTeams.map(nameNorm => ({
                nameNorm: nameNorm,
                puntos: diccionarioEquipos[nameNorm].puntos
            })).sort((a,b) => b.puntos - a.puntos);

            let posMapF = {};
            rankingF.forEach((item, idx) => { posMapF[item.nameNorm] = idx + 1; });

            activeTeams.forEach(nameNorm => {
                let md = matchDetails[nameNorm];
                let varElo = diccionarioEquipos[nameNorm].puntos - puntosPrevios[nameNorm];
                let fReal = md.fechaReal || cacheHistorialGlobal[nameNorm][cacheHistorialGlobal[nameNorm].length - 1].fechaReal;

                cacheHistorialGlobal[nameNorm].push({
                    torneo: nombreTorneoActual,
                    fecha: f,
                    puntos: diccionarioEquipos[nameNorm].puntos,
                    posicion: posMapF[nameNorm],
                    rival: md.rival,
                    resultado: md.resultado,
                    score: md.score,
                    variacion: varElo,
                    fechaReal: fReal
                });
            });
        }
    }
}

// Para mantener compatibilidad con el renderizador de la tabla principal
function calcularRankingHasta(torneoObjetivo, fechaObjetivo) {
    let indicesFiltrados = {};
    let indicesOrdenados = torneosOrdenados.indexOf(torneoObjetivo);
    
    // Obtenemos los datos instantáneos de nuestra caché global
    let rankingActual = [];
    
    for (let nameNorm in cacheHistorialGlobal) {
        let hist = cacheHistorialGlobal[nameNorm];
        let snapshot = hist.find(h => h.torneo === torneoObjetivo && h.fecha === fechaObjetivo);
        if (snapshot) {
            rankingActual.push({
                nombre: snapshot.rival ? nameNorm : snapshot.rival || nameNorm, 
                nombreReal: nameNorm,
                puntos: snapshot.puntos,
                posicion: snapshot.posicion
            });
        }
    }

    // Traducir nombres reales
    let nombresOriginales = {};
    datosPartidos.forEach(p => {
        nombresOriginales[normalizarNombre(obtenerCampo(p, 'Local'))] = obtenerCampo(p, 'Local').trim();
    });

    rankingActual.forEach(eq => {
        eq.nombre = nombresOriginales[eq.nombreReal] || eq.nombreReal;
    });

    rankingActual.sort((a, b) => b.puntos - a.puntos);
    rankingActual.forEach((eq, index) => eq.posicion = index + 1);

    return rankingActual;
}

function renderizarTabla(torneoSeleccionado, fechaSeleccionada) {
    const tabla = document.querySelector("#tablaRanking tbody");
    if (!tabla) return;
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
            <td class="equipo-nombre" onclick="abrirFichaClub('${equipo.nombre}')">${equipo.nombre} ${tagAscenso}</td>
            <td class="puntos-totales">${Math.round(equipo.puntos)}</td>
            <td>${textoPts}</td>
        </tr>
        `;
    });
}

// -------------------------------------------------------------------------
// NUEVAS FUNCIONES DE LA INTERFAZ: FICHA COMPLETA DEL CLUB (Sofascore style)
// -------------------------------------------------------------------------
function abrirFichaClub(nombreClub) {
    clubSeleccionadoActivo = nombreClub;
    const norm = normalizarNombre(nombreClub);
    const historialCompleto = cacheHistorialGlobal[norm];

    if (!historialCompleto || historialCompleto.length === 0) return;

    // Abrir Modal
    const modal = document.getElementById("modalGrafico");
    modal.style.display = "flex";

    // Titular del Club
    document.getElementById("tituloModal").innerText = nombreClub;

    // Calcular estadísticas históricas hasta la fecha actualmente seleccionada
    const torneoSelect = document.getElementById("selectorTorneo").value;
    const fechaSelect = Number(document.getElementById("selectorFecha").value);
    const limTorneoIdx = torneosOrdenados.indexOf(torneoSelect);

    // Filtrar todo el historial hasta el momento de visualización
    const histFiltrado = historialCompleto.filter(h => {
        let tIdx = torneosOrdenados.indexOf(h.torneo);
        if (tIdx < limTorneoIdx) return true;
        if (tIdx === limTorneoIdx && h.fecha <= fechaSelect) return true;
        return false;
    });

    // 1. Snapshot Actual
    let snapActual = histFiltrado[histFiltrado.length - 1];
    let snapAnterior = histFiltrado.length > 1 ? histFiltrado[histFiltrado.length - 2] : null;

    document.getElementById("statPosicion").innerText = `${snapActual.posicion}°`;
    document.getElementById("statElo").innerText = Math.round(snapActual.puntos);

    // Cambios (Deltas) en tarjetas principales
    if (snapAnterior) {
        let difPos = snapAnterior.posicion - snapActual.posicion;
        let difElo = snapActual.puntos - snapAnterior.puntos;

        // Posición cambio
        let pCambio = document.getElementById("statCambioPos");
        if (difPos > 0) { pCambio.className = "stat-change sube"; pCambio.innerText = `▲ +${difPos}`; }
        else if (difPos < 0) { pCambio.className = "stat-change baja"; pCambio.innerText = `▼ ${difPos}`; }
        else { pCambio.className = "stat-change igual"; pCambio.innerText = `-`; }

        // Elo cambio
        let eCambio = document.getElementById("statCambioElo");
        if (difElo > 0) { eCambio.className = "stat-change sube"; eCambio.innerText = `▲ +${difElo.toFixed(1)}`; }
        else if (difElo < 0) { eCambio.className = "stat-change baja"; eCambio.innerText = `▼ ${difElo.toFixed(1)}`; }
        else { eCambio.className = "stat-change igual"; eCambio.innerText = `-`; }
    } else {
        document.getElementById("statCambioPos").innerText = "-";
        document.getElementById("statCambioElo").innerText = "-";
    }

    // 2. Estadísticas Secundarias
    let posicionesList = histFiltrado.map(h => h.posicion);
    let mejorPos = Math.min(...posicionesList);
    let peorPos = Math.max(...posicionesList);
    let torneosDisputados = [...new Set(histFiltrado.map(h => h.torneo))].length;

    let subidas = histFiltrado.map(h => h.variacion).filter(v => v > 0);
    let bajadas = histFiltrado.map(h => h.variacion).filter(v => v < 0);
    let mayorSubida = subidas.length > 0 ? Math.max(...subidas) : 0;
    let mayorBajada = bajadas.length > 0 ? Math.min(...bajadas) : 0;

    document.getElementById("statMejorPos").innerText = `${mejorPos}°`;
    document.getElementById("statPeorPos").innerText = `${peorPos}°`;
    document.getElementById("statTorneos").innerText = torneosDisputados;
    document.getElementById("statMayorSubida").innerText = `+${mayorSubida.toFixed(1)}`;
    document.getElementById("statMayorBajada").innerText = `${mayorBajada.toFixed(1)}`;

    // Estado del club (Si jugó en el torneo seleccionado o descendió)
    let tagEstado = document.getElementById("tagEstadoClub");
    let juegaHoy = snapActual.torneo === torneoSelect;
    if (juegaHoy) {
        tagEstado.innerText = "Primera División";
        tagEstado.style.background = "rgba(0, 40, 94, 0.08)";
        tagEstado.style.color = "var(--primary)";
    } else {
        tagEstado.innerText = "En el Ascenso / Inactivo";
        tagEstado.style.background = "rgba(113, 128, 150, 0.15)";
        tagEstado.style.color = "var(--text-muted)";
    }

    // Dibujar el gráfico con los filtros activos por defecto
    actualizarVisualizacionGrafico();
}

function actualizarVisualizacionGrafico() {
    const norm = normalizarNombre(clubSeleccionadoActivo);
    const historialCompleto = cacheHistorialGlobal[norm];

    const torneoSelect = document.getElementById("selectorTorneo").value;
    const fechaSelect = Number(document.getElementById("selectorFecha").value);
    const limTorneoIdx = torneosOrdenados.indexOf(torneoSelect);

    // 1. Filtrar base límite de tiempo actual
    let datosFiltrados = historialCompleto.filter(h => {
        let tIdx = torneosOrdenados.indexOf(h.torneo);
        if (tIdx < limTorneoIdx) return true;
        if (tIdx === limTorneoIdx && h.fecha <= fechaSelect) return true;
        return false;
    });

    let fechaLimiteReal = datosFiltrados[datosFiltrados.length - 1].fechaReal;

    // 2. Aplicar Filtro de Rango (Torneo o Tiempo)
    if (filtroTipoActivo === "torneo") {
        if (filtroValorActivo === "ultimo") {
            datosFiltrados = datosFiltrados.filter(h => h.torneo === torneoSelect);
        } else if (filtroValorActivo === "2") {
            let inicioIdx = Math.max(0, limTorneoIdx - 1);
            datosFiltrados = datosFiltrados.filter(h => {
                let idx = torneosOrdenados.indexOf(h.torneo);
                return idx >= inicioIdx && idx <= limTorneoIdx;
            });
        } else if (filtroValorActivo === "5") {
            let inicioIdx = Math.max(0, limTorneoIdx - 4);
            datosFiltrados = datosFiltrados.filter(h => {
                let idx = torneosOrdenados.indexOf(h.torneo);
                return idx >= inicioIdx && idx <= limTorneoIdx;
            });
        }
        // En filtros de Torneo mostramos TODOS los puntos (Fechas completas)
    } else {
        // Filtro por tiempo
        let msLimite = fechaLimiteReal.getTime();
        let msFiltro = 0;

        if (filtroValorActivo === "1año") msFiltro = 365 * 24 * 60 * 60 * 1000;
        else if (filtroValorActivo === "2años") msFiltro = 2 * 365 * 24 * 60 * 60 * 1000;
        else if (filtroValorActivo === "5años") msFiltro = 5 * 365 * 24 * 60 * 60 * 1000;

        if (msFiltro > 0) {
            datosFiltrados = datosFiltrados.filter(h => (msLimite - h.fechaReal.getTime()) <= msFiltro);
        }

        // LIMPIEZA DE GRÁFICO (Estilo Sofascore): 
        // Si hay rango temporal amplio, reducimos a un único punto por torneo (la fecha de cierre),
        // manteniendo solo detallada la fecha actual seleccionada para evitar saturar el canvas.
        if (filtroValorActivo !== "1año") {
            datosFiltrados = datosFiltrados.filter((h, idx) => {
                // Dejar siempre el inicio (fecha 0), final de torneo, o el último punto de la lista
                let partidosDelTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === h.torneo);
                let fechas = [...new Set(partidosDelTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
                let maxF = fechas.filter(n => !isNaN(n) && n > 0).length > 0 ? Math.max(...fechas.filter(n => !isNaN(n) && n > 0)) : 0;

                return h.fecha === maxF || h.fecha === 0 || idx === datosFiltrados.length - 1;
            });
        }
    }

    // Dibujar en Chart.js
    let etiquetasX = datosFiltrados.map(h => {
        let torneoCorto = h.torneo
            .replace("Torneo Inicial", "Inicial")
            .replace("Torneo Final", "Final")
            .replace("Torneo de Transicion", "Transición")
            .replace("Torneo de Transición", "Transición")
            .replace("Temporada", "Temp.")
            .replace("Campeonato de Primera Division", "Camp.")
            .replace("Campeonato de Primera División", "Camp.");
        return h.fecha === 0 ? `${torneoCorto} (Inicio)` : `${torneoCorto} (F${h.fecha})`;
    });

    let datasetY = datosFiltrados.map(h => {
        return {
            x: etiquetasX[datosFiltrados.indexOf(h)],
            y: modoMetricaActivo === "posicion" ? h.posicion : Math.round(h.puntos),
            // Metadatos para el Tooltip Sofascore
            torneo: h.torneo,
            fecha: h.fecha,
            posicion: h.posicion,
            elo: Math.round(h.puntos),
            rival: h.rival,
            resultado: h.resultado,
            score: h.score,
            variacion: h.variacion
        };
    });

    if (miGrafico) {
        miGrafico.destroy();
    }

    let ctx = document.getElementById("canvasGrafico").getContext("2d");
    miGrafico = new Chart(ctx, {
        type: "line",
        data: {
            labels: etiquetasX,
            datasets: [{
                label: modoMetricaActivo === "posicion" ? "Posición en la Tabla" : "Puntos de Rendimiento Elo",
                data: datasetY,
                borderColor: "#00285e",
                backgroundColor: "rgba(0, 40, 94, 0.05)",
                borderWidth: 3,
                pointRadius: datasetY.length > 50 ? 2 : 4,
                pointHoverRadius: 7,
                pointBackgroundColor: "#00285e",
                tension: 0.15,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: modoMetricaActivo === "posicion", // Invierte eje para la posición (1 arriba)
                    min: modoMetricaActivo === "posicion" ? 1 : undefined,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: "#edf2f7"
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: "rgba(0, 20, 50, 0.9)",
                    titleFont: { size: 13, weight: "bold" },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            let d = context[0].raw;
                            return `${d.torneo} - Fecha ${d.fecha}`;
                        },
                        label: function(context) {
                            let d = context.raw;
                            let lines = [];
                            lines.push(`Posición: ${d.posicion}°`);
                            lines.push(`Puntos Elo: ${d.elo}`);
                            
                            if (d.rival) {
                                lines.push(`Rival: ${d.rival}`);
                                lines.push(`Resultado: ${d.resultado} (${d.score})`);
                            }
                            
                            if (d.fecha > 0) {
                                let signo = d.variacion >= 0 ? "+" : "";
                                lines.push(`Variación: ${signo}${d.variacion.toFixed(2)} pts`);
                            }
                            return lines;
                        }
                    }
                }
            }
        }
    });
}

// -------------------------------------------------------------------------
// INICIALIZADORES Y GESTIÓN DE EVENTOS
// -------------------------------------------------------------------------
function cambiarFiltro(tipo, valor, elemento) {
    filtroTipoActivo = tipo;
    filtroValorActivo = valor;

    // Desactivar botones de ambos grupos
    document.querySelectorAll("#grupoFiltrosTorneo .btn-pill").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("#grupoFiltrosTiempo .btn-pill").forEach(b => b.classList.remove("active"));

    // Activar el seleccionado
    elemento.classList.add("active");

    actualizarVisualizacionGrafico();
}

function cambiarModoGrafico(modo) {
    modoMetricaActivo = modo;
    
    document.getElementById("segmentPosicion").classList.remove("active");
    document.getElementById("segmentElo").classList.remove("active");

    if (modo === "posicion") {
        document.getElementById("segmentPosicion").classList.add("active");
    } else {
        document.getElementById("segmentElo").classList.add("active");
    }

    actualizarVisualizacionGrafico();
}

function registrarEventosModal() {
    // Vincular clics de los botones dinámicos de píldoras
    document.querySelectorAll("#grupoFiltrosTorneo .btn-pill").forEach(btn => {
        btn.addEventListener("click", () => cambiarFiltro("torneo", btn.getAttribute("data-valor"), btn));
    });

    document.querySelectorAll("#grupoFiltrosTiempo .btn-pill").forEach(btn => {
        btn.addEventListener("click", () => cambiarFiltro("tiempo", btn.getAttribute("data-valor"), btn));
    });

    document.getElementById("segmentPosicion").addEventListener("click", () => cambiarModoGrafico("posicion"));
    document.getElementById("segmentElo").addEventListener("click", () => cambiarModoGrafico("elo"));

    // Cerrar Modal
    const modal = document.getElementById("modalGrafico");
    const btnCerrar = document.getElementById("btnCerrarModal");

    if (btnCerrar && modal) {
        btnCerrar.onclick = () => { modal.style.display = "none"; };
        window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
    }
}

function actualizarDesplegableFechas(torneoSeleccionado) {
    const selectorFecha = document.getElementById("selectorFecha");
    if (!selectorFecha) return;
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

        torneosOrdenados = [...new Set(datosPartidos.map(p => {
            let t = obtenerCampo(p, 'Torneo');
            return (t || "").trim();
        }).filter(t => t !== ""))];
        
        if (torneosOrdenados.length === 0) throw new Error("No se encontraron torneos en el CSV.");

        partidosPorFechaYTorneo = {};
        datosPartidos.forEach(p => {
            let t = obtenerCampo(p, 'Torneo').trim();
            let f = Number(obtenerCampo(p, 'Fecha_del_Torneo'));
            if (t && !isNaN(f)) {
                let clave = `${t}|${f}`;
                partidosPorFechaYTorneo[clave] = (partidosPorFechaYTorneo[clave] || 0) + 1;
            }
        });

        torneosOrdenados.forEach(torneo => {
            let partidosDeEsteTorneo = datosPartidos.filter(p => obtenerCampo(p, 'Torneo').trim() === torneo);
            let fechas = [...new Set(partidosDeEsteTorneo.map(p => Number(obtenerCampo(p, 'Fecha_del_Torneo'))))];
            let fechasValidas = fechas.filter(n => !isNaN(n) && n > 0);
            fechasPorTorneo[torneo] = fechasValidas.length > 0 ? Math.max(...fechasValidas) : 0;
        });

        // -----------------------------------------------------------
        // CALCULO COMPLETO EN CACHÉ (Corre una sola vez en el arranque)
        // -----------------------------------------------------------
        precalcularHistorialCompleto();

        const selectorTorneo = document.getElementById("selectorTorneo");
        if (selectorTorneo) {
            selectorTorneo.innerHTML = "";
            torneosOrdenados.forEach(torneo => {
                let option = document.createElement("option");
                option.value = torneo;
                option.text = torneo;
                selectorTorneo.appendChild(option);
            });
        }

        const selectorFecha = document.getElementById("selectorFecha");

        if (selectorTorneo && selectorFecha) {
            selectorTorneo.addEventListener("change", (e) => {
                let torneoSeleccionado = e.target.value;
                actualizarDesplegableFechas(torneoSeleccionado);
                renderizarTabla(torneoSeleccionado, Number(selectorFecha.value));
            });

            selectorFecha.addEventListener("change", (e) => {
                renderizarTabla(selectorTorneo.value, Number(e.target.value));
            });
        }

        const nota = document.createElement("div");
        nota.innerHTML = "<p style='font-size:12px; color:#666; text-align:center; margin-top:20px; font-style:italic;'>Metodología: Sistema Elo Internacional (K=25 variable). Incluye ventaja de localía, multiplicador por diferencia de gol, importancia de playoffs y regresión a la media.</p>";
        const contenedor = document.querySelector(".contenedor");
        if (contenedor) {
            contenedor.appendChild(nota);
        }

        // Registrar eventos interactivos del modal de visualización
        registrarEventosModal();

        // Cargar el torneo más reciente que tengamos registrado
        let torneoInicial = torneosOrdenados[torneosOrdenados.length - 1];
        if (selectorTorneo && selectorFecha) {
            selectorTorneo.value = torneoInicial;
            actualizarDesplegableFechas(torneoInicial);
            renderizarTabla(torneoInicial, Number(selectorFecha.value));
        }

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
