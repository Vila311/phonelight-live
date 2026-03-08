const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

let connectedUsers = 0;
let lastZonesData = {}; // Ahora guardamos un objeto de zonas
let bridgeActive = false;
let lastBridgeUpdate = Date.now();

io.on("connection", (socket) => {
    connectedUsers++;
    io.emit("stats-update", { users: connectedUsers, bridgeStatus: bridgeActive });

    // Lógica para que el móvil se una a una zona específica
    socket.on("join-zone", (zoneId) => {
        // Sacar de zonas anteriores para evitar duplicados
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(zoneId);
        console.log(`📍 Móvil ${socket.id} unido a zona: ${zoneId}`);
        
        // Si ya hay un color para esa zona, se lo mandamos de inmediato
        if (lastZonesData[zoneId]) {
            socket.emit("color-update", lastZonesData);
        }
    });

    socket.on("disconnect", () => {
        connectedUsers--;
        io.emit("stats-update", { users: connectedUsers });
    });
});

// RUTA PARA RECIBIR DATOS MULTI-ZONA DESDE EL BRIDGE
app.post("/updateColor", (req, res) => {
    const data = req.body; // Recibe { "A1": {r,g,b}, "A2": ... } o { type: 'heartbeat' }
    
    bridgeActive = true;
    lastBridgeUpdate = Date.now();

    if (data.type === 'heartbeat') {
        io.emit("stats-update", { bridgeStatus: true, log: "💓 Latido recibido" });
        return res.send("ALIVE");
    }

    // Guardamos el último estado de todas las zonas
    lastZonesData = data;

    // Enviamos el objeto de zonas a TODOS. 
    // El index.html filtrará según su propia zona.
    io.emit("color-update", lastZonesData);
    
    io.emit("stats-update", { bridgeStatus: true, log: "🌈 Actualización de Zonas" });
    res.send("OK");
});

// Blackout de seguridad
setInterval(() => {
    if (bridgeActive && (Date.now() - lastBridgeUpdate > 5000)) {
        bridgeActive = false;
        lastZonesData = {}; 
        // Mandamos un objeto vacío o negro a todos
        io.emit("color-update", {}); 
        io.emit("stats-update", { bridgeStatus: false, log: "⚠️ BRIDGE OFFLINE" });
    }
}, 2000);

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

server.listen(PORT, () => console.log(`🚀 Servidor de Estadio Activo en puerto ${PORT}`));