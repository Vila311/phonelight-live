// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Puerto dinámico para Railway
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON
app.use(express.json());

// Servir archivos estáticos de la carpeta 'public'
app.use(express.static("public"));

// Conexión de clientes WebSocket
io.on("connection", (socket) => {
  console.log("📱 User connected");

  socket.on("disconnect", () => {
    console.log("📱 User disconnected");
  });
});

// Ruta para recibir colores desde tu PC puente (DMX → web)
app.post("/updateColor", (req, res) => {
  const { r, g, b } = req.body;

  if (r === undefined || g === undefined || b === undefined) {
    return res.status(400).send("Faltan datos de color");
  }

  // Emitir a todos los clientes conectados
  io.emit("colorChange", { r, g, b });

  console.log(`🎨 Color recibido → R=${r} G=${g} B=${b}`);

  res.send("Color recibido");
});

// Arrancar servidor web
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});