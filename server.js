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

// Estado Global
let connectedUsers = 0;
let lastColor = { r: 0, g: 0, b: 0 };
let bridgeActive = false;
let lastBridgeUpdate = Date.now();

io.on("connection", (socket) => {
    connectedUsers++;
    // Enviar estado actual al entrar
    socket.emit("color", lastColor);
    io.emit("stats-update", { users: connectedUsers, bridgeStatus: bridgeActive });

    socket.on("disconnect", () => {
        connectedUsers--;
        io.emit("stats-update", { users: connectedUsers });
    });
});

// Ruta que recibe datos desde tu PC (Bridge)
app.post("/updateColor", (req, res) => {
    const { r, g, b, sentAt } = req.body;
    
    lastColor = { r, g, b, sentAt };
    bridgeActive = true;
    lastBridgeUpdate = Date.now();

    // Notificar a móviles y al panel de administración
    io.emit("color", lastColor);
    io.emit("stats-update", { 
        bridgeStatus: true, 
        log: `DMX recibido: RGB(${r},${g},${b})` 
    });

    res.send("OK");
});

// MONITOR DE SEGURIDAD: Auto-Blackout si el bridge se cae
setInterval(() => {
    if (bridgeActive && (Date.now() - lastBridgeUpdate > 3000)) {
        bridgeActive = false;
        lastColor = { r: 0, g: 0, b: 0 }; // Forzar negro
        
        io.emit("color", lastColor); 
        io.emit("stats-update", { 
            bridgeStatus: false, 
            log: "⚠️ CRÍTICO: Bridge desconectado. Forzando BLACKOUT." 
        });
        console.log("⚠️ Conexión perdida con el PC local. Pantallas a negro.");
    }
}, 2000);

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor Phonelight corriendo en puerto ${PORT}`);
});