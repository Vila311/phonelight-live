const { dmxnet } = require('dmxnet');
const axios = require('axios');

// CONFIGURACIÓN - Cambia 'tu-app' por tu nombre real en Railway
const RAILWAY_URL = "https://tu-app.railway.app/updateColor"; 
const INTERFACE_IP = "10.0.2.170"; 

const dmx = new dmxnet();

const receiver = dmx.newReceiver({
  ip: INTERFACE_IP,
  subnet: 0,
  universe: 0,
  port: 6454
});

console.log("🚀 Bridge iniciado con éxito.");
console.log("📡 Escuchando Art-Net y enviando a:", RAILWAY_URL);

let lastSentTime = 0;
const throttleMs = 45; // Enviamos aprox 22 fps para no saturar la red del estadio

receiver.on('data', (data) => {
  const now = Date.now();
  
  if (now - lastSentTime > throttleMs) {
    const payload = {
      r: data[0], 
      g: data[1], 
      b: data[2],
      sentAt: now // Para medir los MS en el dashboard
    };

    axios.post(RAILWAY_URL, payload)
      .catch(err => console.error("⚠️ Error de conexión:", err.message));

    lastSentTime = now;
  }
});