const { dmxnet } = require('dmxnet');
const axios = require('axios');

// CONFIGURACIÓN
const RAILWAY_URL = "https://tu-app.railway.app/updateColor"; // <--- CAMBIA ESTO
const INTERFACE_IP = "0.0.0.0"; // Escucha en todas las redes del PC

const dmx = new dmxnet();

// Configurar el receptor Art-Net
const receiver = dmx.newReceiver({
  ip: INTERFACE_IP,
  subnet: 0,
  universe: 0,
  port: 6454
});

console.log("🚀 Bridge iniciado y escuchando Art-Net...");
console.log("📡 Enviando datos a:", RAILWAY_URL);

let lastSentTime = 0;
const throttleMs = 40; // Máximo 25 envíos por segundo para no saturar Railway

receiver.on('data', (data) => {
  const now = Date.now();
  
  // Throttle: Evitamos enviar demasiados paquetes por segundo
  if (now - lastSentTime > throttleMs) {
    const r = data[0]; // Canal 1
    const g = data[1]; // Canal 2
    const b = data[2]; // Canal 3

    const payload = {
      r: r,
      g: g,
      b: b,
      sentAt: now // IMPORTANTE: Para calcular el delay en el Admin
    };

    axios.post(RAILWAY_URL, payload)
      .then(() => {
        // Opcional: console.log(`Enviado: RGB(${r},${g},${b})`);
      })
      .catch(err => {
        console.error("❌ Error de conexión con Railway:", err.message);
      });

    lastSentTime = now;
  }
});