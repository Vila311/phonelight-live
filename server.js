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
    socket.emit("color", lastColor);
    io.emit("stats-update", { users: connectedUsers, bridgeStatus: bridgeActive });

    socket.on("disconnect", () => {
        connectedUsers--;
        io.emit("stats-update", { users: connectedUsers });
    });
});

app.post("/updateColor", (req, res) => {
    const { r, g, b, sentAt } = req.body;
    lastColor = { r, g, b, sentAt };
    bridgeActive = true;
    lastBridgeUpdate = Date.now();

    io.emit("color", lastColor);
    io.emit("stats-update", { bridgeStatus: true, log: `DMX: RGB(${r},${g},${b})` });
    res.send("OK");
});

// MONITOR DE SEGURIDAD (Si el bridge muere -> Todo a negro)
setInterval(() => {
    if (bridgeActive && (Date.now() - lastBridgeUpdate > 3500)) {
        bridgeActive = false;
        lastColor = { r: 0, g: 0, b: 0 };
        io.emit("color", lastColor); 
        io.emit("stats-update", { bridgeStatus: false, log: "⚠️ BRIDGE OFFLINE - BLACKOUT ACTIVADO" });
    }
}, 2000);

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

server.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));