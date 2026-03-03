const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const dgram = require("dgram");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const ARTNET_PORT = 6454;
const udpServer = dgram.createSocket("udp4");

// Servir archivos estáticos
app.use(express.static("public"));

// Conexión de móviles
io.on("connection", (socket) => {
  console.log("📱 User connected");
});

// Guardar último color
let lastColor = { r: -1, g: -1, b: -1 };

// Escuchar paquetes Art-Net
udpServer.on("message", (msg) => {
  if (msg.toString("ascii", 0, 7) !== "Art-Net") return;

  const dmxData = msg.slice(18);

  const r = dmxData[0] || 0;
  const g = dmxData[1] || 0;
  const b = dmxData[2] || 0;

  // Evitar enviar colores repetidos
  if (r === lastColor.r && g === lastColor.g && b === lastColor.b) return;
  lastColor = { r, g, b };

  console.log(`🎛 DMX → R=${r} G=${g} B=${b}`);
  io.emit("color", { r, g, b }); // <- evento 'color' para que coincida con index.html
});

// Escuchar en todas las interfaces y puerto dinámico
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// UDP server para Art-Net
udpServer.bind(ARTNET_PORT, () => {
  console.log(`🎛 Escuchando Art-Net en puerto ${ARTNET_PORT}`);
});