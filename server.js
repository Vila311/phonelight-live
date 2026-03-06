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
let lastColor = { r: 0, g: 0, b: 0 };
let bridgeActive = false;
let lastBridgeUpdate = Date.now();

io.on("connection", (socket) => {
    connectedUsers++;
    socket.emit("color", lastColor); // Enviar color actual al conectar
    io.emit("stats-update", { users: connectedUsers, bridgeStatus: bridgeActive });

    socket.on("disconnect", () => {
        connectedUsers--;
        io.emit("stats-update", { users: connectedUsers });
    });
});

app.post("/updateColor", (req, res) => {
    const { r, g, b, sentAt, type } = req.body;
    bridgeActive = true;
    lastBridgeUpdate = Date.now();

    if (type === 'heartbeat') {
        io.emit("stats-update", { bridgeStatus: true, log: "💓 Latido recibido" });
        return res.send("ALIVE");
    }

    lastColor = { r, g, b, sentAt };
    io.emit("color", lastColor); // Notificar a los dispositivos móviles
    io.emit("stats-update", { bridgeStatus: true, log: `Color: RGB(${r},${g},${b})` });
    res.send("OK");
});

// Blackout si pasan más de 5 segundos sin señal
setInterval(() => {
    if (bridgeActive && (Date.now() - lastBridgeUpdate > 5000)) {
        bridgeActive = false;
        lastColor = { r: 0, g: 0, b: 0 };
        io.emit("color", lastColor); 
        io.emit("stats-update", { bridgeStatus: false, log: "⚠️ BRIDGE OFFLINE - BLACKOUT ACTIVADO" });
    }
}, 2000);

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
server.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));