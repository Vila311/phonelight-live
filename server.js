const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Puerto dinámico para Railway
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Variables de estado global
let connectedUsers = 0;
let lastColor = { r: 0, g: 0, b: 0 };

// --- GESTIÓN DE WEBSOCKETS ---
io.on("connection", (socket) => {
  connectedUsers++;
  console.log(`📱 Usuario conectado (${connectedUsers} en total)`);
  
  // Enviar el último color y el conteo actual nada más conectar
  socket.emit("color", lastColor); 
  io.emit("stats-update", { users: connectedUsers });

  socket.on("disconnect", () => {
    connectedUsers--;
    console.log(`📱 Usuario desconectado (${connectedUsers} restantes)`);
    io.emit("stats-update", { users: connectedUsers });
  });
});

// --- RUTAS HTTP ---

// Recibir colores desde el PC Puente (bridge.js)
app.post("/updateColor", (req, res) => {
  const { r, g, b } = req.body;

  if (r === undefined || g === undefined || b === undefined) {
    return res.status(400).send("Faltan datos de color");
  }

  lastColor = { r, g, b };

  // Emitimos 'color' (para el Admin) y 'colorChange' (para los usuarios)
  // O mejor, unificamos a 'color' en todos los sitios para no liarnos
  io.emit("color", lastColor);

  console.log(`🎨 Bridge emitió → R=${r} G=${g} B=${b}`);
  res.send("Color recibido");
});

// Ruta para el panel de administración
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Arrancar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor en marcha en puerto ${PORT}`);
  console.log(`📊 Admin Dashboard en: /admin`);
});