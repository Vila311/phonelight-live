const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dgram = require("dgram");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir carpeta public
app.use(express.static("public"));

// WebSocket conexión
io.on("connection", (socket) => {
  console.log("📱 Usuario conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado:", socket.id);
  });
});

// ===== ART-NET RECEIVER =====
const ARTNET_PORT = 6454;
const artnet = dgram.createSocket("udp4");

artnet.on("message", (msg) => {
  // Verificamos que sea paquete Art-Net
  if (msg.slice(0, 7).toString() === "Art-Net") {
    const dmxData = msg.slice(18);

    // Enviar solo los primeros 3 canales (RGB)
    const r = dmxData[0];
    const g = dmxData[1];
    const b = dmxData[2];

    io.emit("color", { r, g, b });
  }
});

artnet.bind(ARTNET_PORT, () => {
  console.log(`🎛 Escuchando Art-Net en puerto ${ARTNET_PORT}`);
});

// Servidor web
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
