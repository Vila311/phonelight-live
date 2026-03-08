const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let lastBridgeSignal = Date.now();
let bridgeActive = false;

// Ruta que recibe los datos del Bridge (PC con Resolume)
app.post('/updateColor', (req, res) => {
    const data = req.body;
    lastBridgeSignal = Date.now();
    bridgeActive = true;

    if (data.type === 'heartbeat') {
        io.emit('stats-update', { bridgeStatus: true, log: "Latido recibido (Bridge OK)" });
    } else {
        // Reenviar colores a móviles y al mapa del Admin
        io.emit('color-update', data);
        io.emit('stats-update', { bridgeStatus: true, log: "Colores actualizados: Zonas A/B" });
    }
    res.sendStatus(200);
});

// Control de usuarios y Bridge Offline
setInterval(() => {
    if (Date.now() - lastBridgeSignal > 5000) {
        bridgeActive = false;
        io.emit('stats-update', { bridgeStatus: false });
    }
    io.emit('stats-update', { users: io.engine.clientsCount });
}, 3000);

io.on('connection', (socket) => {
    // Sistema de Latencia (Ping)
    socket.on('ping', () => socket.emit('pong'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));