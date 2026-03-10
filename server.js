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

// ─── TOKEN DE SEGURIDAD ───────────────────────────────────────────────────────
// Debe coincidir con el que uses en bridge.js (variable de entorno en Railway)
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'phonelight-secret-2024';

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let lastBridgeSignal = Date.now();
let bridgeActive = false;
let lastColorData = {};

// ─── LOG RATE LIMITER (evita saturar el admin con DMX continuo) ───────────────
let lastLogTime = 0;
const LOG_INTERVAL_MS = 500; // máximo 1 log de color cada 500ms

// ─── PANEL DE ADMINISTRACIÓN ──────────────────────────────────────────────────
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── ENDPOINT DEL BRIDGE ─────────────────────────────────────────────────────
app.post('/updateColor', (req, res) => {
    // Verificar token de autenticación
    const token = req.headers['x-bridge-token'];
    if (token !== BRIDGE_SECRET) {
        console.warn(`⛔ Intento no autorizado desde ${req.ip}`);
        return res.status(401).json({ error: 'No autorizado' });
    }

    const data = req.body;
    lastBridgeSignal = Date.now();
    bridgeActive = true;

    if (data.type === 'heartbeat') {
        io.emit('stats-update', { bridgeStatus: true, log: "💓 Latido recibido (Bridge OK)" });
    } else {
        // Guardar último estado para nuevas conexiones
        lastColorData = data;

        // Emitir colores a cada sala por separado (eficiencia)
        Object.keys(data).forEach(zone => {
            io.to(zone).emit('color-update', { [zone]: data[zone] });
        });

        // También emitir a todos (para admin y clientes legacy)
        io.emit('color-update', data);

        // Rate-limit del log
        const now = Date.now();
        if (now - lastLogTime > LOG_INTERVAL_MS) {
            lastLogTime = now;
            io.emit('stats-update', { bridgeStatus: true, log: `🎨 DMX: Zonas actualizadas → ${Object.keys(data).join(', ')}` });
        }
    }

    res.sendStatus(200);
});

// ─── HEARTBEAT DEL SERVIDOR → ADMIN ──────────────────────────────────────────
setInterval(() => {
    const now = Date.now();
    if (now - lastBridgeSignal > 5000) {
        if (bridgeActive) {
            bridgeActive = false;
            io.emit('stats-update', { bridgeStatus: false, log: "⚠️ Bridge desconectado (sin señal >5s)" });
        }
    }

    io.emit('stats-update', {
        users: io.engine.clientsCount,
        bridgeStatus: bridgeActive
    });
}, 3000);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    // Ping/pong para medir latencia en admin
    socket.on('ping', () => socket.emit('pong'));

    // El cliente se une a su sala de zona
    socket.on('join-zone', (zone) => {
        const validZones = ['A1', 'A2', 'B1', 'B2', 'B3', 'B4'];
        if (!validZones.includes(zone)) return;

        // Salir de cualquier sala previa de zona
        validZones.forEach(z => socket.leave(z));

        socket.join(zone);
        socket.data.zone = zone;

        console.log(`📱 Cliente ${socket.id} → Zona ${zone} | Total: ${io.engine.clientsCount}`);

        // Enviar el último color conocido inmediatamente al nuevo cliente
        if (lastColorData[zone]) {
            socket.emit('color-update', { [zone]: lastColorData[zone] });
        }

        io.emit('stats-update', {
            users: io.engine.clientsCount,
            log: `📱 Nuevo dispositivo en Zona ${zone}`
        });
    });

    socket.on('disconnect', () => {
        const zone = socket.data.zone || '?';
        console.log(`📴 Cliente desconectado (Zona ${zone}) | Total: ${io.engine.clientsCount}`);
        // Pequeño delay para que el conteo sea preciso tras la desconexión
        setTimeout(() => {
            io.emit('stats-update', { users: io.engine.clientsCount });
        }, 100);
    });
});

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));