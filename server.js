const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const dgram = require("dgram");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const ARTNET_PORT = 6454;
const udpServer = dgram.createSocket("udp4");

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("📱 User connected");
});

udpServer.on("message", (msg) => {
  if (msg.toString("ascii", 0, 7) !== "Art-Net") return;
  const dmxData = msg.slice(18);
  const r = dmxData[0] || 0;
  const g = dmxData[1] || 0;
  const b = dmxData[2] || 0;
  console.log(`🎛 DMX → R=${r} G=${g} B=${b}`);
  io.emit("colorChange", { r, g, b });
});

udpServer.bind(ARTNET_PORT);
udpServer.on("listening", () => {
  const address = udpServer.address();
  console.log(`🎛 Escuchando Art-Net en ${address.address}:${address.port}`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});