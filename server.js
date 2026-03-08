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

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Recibir datos del Bridge
app.post('/updateColor', (req, res) => {
    const data = req.body;
    lastBridgeSignal = Date.now();
    bridgeActive = true;

    if (data.type === 'heartbeat') {
        // Emitimos el latido específicamente
        io.emit('stats-update', { bridgeStatus: true, log: "💓 Latido recibido (Bridge OK)" });
    } else {
        io.emit('color-update', data);
        // Solo enviamos log de color si no hay una avalancha de datos
        io.emit('stats-update', { bridgeStatus: true, log: "🎨 DMX: Zonas actualizadas" });
    }
    res.sendStatus(200);
});

// Monitor constante
setInterval(() => {
    const now = Date.now();
    bridgeActive = (now - lastBridgeSignal < 5000);
    
    io.emit('stats-update', { 
        users: io.engine.clientsCount,
        bridgeStatus: bridgeActive 
    });
}, 3000);

io.on('connection', (socket) => {
    socket.on('ping', () => socket.emit('pong'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));