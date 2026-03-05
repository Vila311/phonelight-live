const { dmxnet } = require('dmxnet');
const axios = require('axios');

// --- CONFIGURACIÓN CORREGIDA ---
const RAILWAY_URL = "https://phonelight-live-production.up.railway.app/updateColor"; 
const INTERFACE_IP = "10.0.2.170"; 

const dmx = new dmxnet();

const receiver = dmx.newReceiver({
  ip: INTERFACE_IP,
  subnet: 0,
  universe: 0,
  port: 6454
});

console.log("🚀 Bridge escuchando Art-Net...");
console.log("📡 Enviando a:", RAILWAY_URL);

let lastSentTime = 0;
const throttleMs = 50; 

receiver.on('data', (data) => {
  const now = Date.now();
  if (now - lastSentTime > throttleMs) {
    const r = data[0]; 
    const g = data[1]; 
    const b = data[2];

    const payload = { r, g, b, sentAt: now };

    axios.post(RAILWAY_URL, payload)
      .then(() => {
         console.log(`✅ Color enviado: R:${r} G:${g} B:${b}`);
      })
      .catch(err => {
         console.error("❌ Error de red:", err.message);
      });

    lastSentTime = now;
  }
});