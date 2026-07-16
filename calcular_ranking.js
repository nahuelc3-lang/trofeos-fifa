<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ranking AFA Histórico</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f2f5;
            color: #333;
        }
        .contenedor {
            max-width: 900px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        .controles {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 20px;
            gap: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #ddd;
        }
        .grupo-control {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        select {
            padding: 8px 12px;
            font-size: 16px;
            border-radius: 4px;
            border: 1px solid #ccc;
            cursor: pointer;
            min-width: 200px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border-bottom: 1px solid #eee;
            padding: 12px 15px;
            text-align: center;
        }
        th {
            background: #00285e;
            color: white;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 1px;
        }
        tr:hover { background: #f5f5f5; }
        
        /* ESTILO INTERACTIVO PARA LOS NOMBRES DE EQUIPOS */
        .equipo-nombre { 
            text-align: left; 
            font-weight: bold; 
            font-size: 15px; 
            cursor: pointer;
            color: #00285e;
            text-decoration: underline dotted;
            transition: color 0.2s;
        }
        .equipo-nombre:hover {
            color: #0056b3;
            text-decoration: underline;
        }

        .sube { color: #28a745; font-weight: bold; }
        .baja { color: #dc3545; font-weight: bold; }
        .igual { color: #6c757d; font-weight: bold; }
        .puntos-totales { font-weight: bold; font-size: 16px; }

        /* ESTILOS DEL MODAL FLOTANTE */
        .modal {
            display: none; 
            position: fixed; 
            z-index: 2000; 
            left: 0;
            top: 0;
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.6); 
            align-items: center;
            justify-content: center;
        }
        .modal-contenido {
            background-color: white;
            padding: 25px;
            border-radius: 12px;
            width: 90%;
            max-width: 750px;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .cerrar-modal {
            color: #aaa;
            font-size: 32px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            top: 10px;
            right: 20px;
            transition: color 0.2s;
        }
        .cerrar-modal:hover {
            color: #333;
        }
    </style>
</head>
<body>

<div class="contenedor">
    <h1>Ranking AFA Histórico</h1>
    
    <div class="controles">
        <div class="grupo-control">
            <label for="selectorTorneo"><strong>Torneo:</strong></label>
            <select id="selectorTorneo"></select>
        </div>
        
        <div class="grupo-control">
            <label for="selectorFecha"><strong>Fecha:</strong></label>
            <select id="selectorFecha"></select>
        </div>
    </div>

    <table id="tablaRanking">
        <thead>
            <tr>
                <th>Pos</th>
                <th>+/-</th>
                <th style="text-align: left;">Equipo</th>
                <th>Puntos</th>
                <th>Dif. Pts</th>
            </tr>
        </thead>
        <tbody>
            </tbody>
    </table>
</div>

<div id="modalGrafico" class="modal">
    <div class="modal-contenido">
        <span class="cerrar-modal">&times;</span>
        <h2 id="tituloModal" style="text-align: center; margin-top: 0; color: #00285e; font-size: 22px;">Evolución de Posición</h2>
        <div style="height: 380px; position: relative; width: 100%; margin-top: 15px;">
            <canvas id="canvasGrafico"></canvas>
        </div>
    </div>
</div>

<script src="calcular_ranking.js"></script>

</body>
</html>
