const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let lastBridgeSignal = Date.now();
let bridgeActive = false;

// Ruta explícita para el panel de administración
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Recibir datos desde el Bridge
app.post('/updateColor', (req, res) => {
    const data = req.body;
    lastBridgeSignal = Date.now();
    bridgeActive = true;

    if (data.type === 'heartbeat') {
        io.emit('stats-update', { bridgeStatus: true, log: "Latido recibido (Bridge OK)" });
    } else {
        // Enviar colores a los clientes (móviles) y al mapa del Admin
        io.emit('color-update', data);
        io.emit('stats-update', { bridgeStatus: true, log: "DMX: Colores actualizados" });
    }
    res.sendStatus(200);
});

// Monitor de estado y usuarios
setInterval(() => {
    const now = Date.now();
    if (now - lastBridgeSignal > 5000) {
        bridgeActive = false;
    }
    io.emit('stats-update', { 
        users: io.engine.clientsCount,
        bridgeStatus: bridgeActive 
    });
}, 3000);

io.on('connection', (socket) => {
    socket.on('ping', () => socket.emit('pong'));
});

// PUERTO 8080 solicitado para Railway
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Servidor Phonelight ejecutándose en puerto ${PORT}`);
});