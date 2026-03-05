// server.js mejorado
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
  // Enviar estado actual al nuevo admin
  io.emit("stats-update", { 
    users: connectedUsers, 
    bridgeStatus: bridgeActive,
    color: lastColor 
  });

  socket.on("disconnect", () => {
    connectedUsers--;
    io.emit("stats-update", { users: connectedUsers });
  });
});

// Ruta que recibe datos del bridge (ajusta tu bridge.js para apuntar aquí)
app.post("/updateColor", (req, res) => {
  const { r, g, b } = req.body;
  lastColor = { r, g, b };
  bridgeActive = true;
  lastBridgeUpdate = Date.now();

  io.emit("color", lastColor); // Para los usuarios e index.html
  io.emit("stats-update", { 
    users: connectedUsers, 
    bridgeStatus: true, 
    color: lastColor,
    log: `Paquete DMX recibido: RGB(${r},${g},${b})`
  });

  res.send("OK");
});

// Chequeo de salud del Bridge (cada 3 segundos)
setInterval(() => {
  if (Date.now() - lastBridgeUpdate > 3000) {
    bridgeActive = false;
    io.emit("stats-update", { bridgeStatus: false });
  }
}, 2000);

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

server.listen(PORT, () => console.log(`🚀 Dashboard en /admin`));