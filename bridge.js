const { dmxnet } = require('dmxnet');
const axios = require('axios');

// --- CONFIGURACIÓN CRÍTICA ---
// 1. REEMPLAZA ESTA URL con la tuya real de Railway (ej: https://phonelight-production.up.railway.app/updateColor)
const RAILWAY_URL = "https://TU-URL-DE-RAILWAY.app/updateColor"; 
const INTERFACE_IP = "10.0.2.170"; // Escucha en todas las redes

const dmx = new dmxnet();

// CAMBIO CLAVE: .newReceiver en lugar de .newSender
const receiver = dmx.newReceiver({
  ip: INTERFACE_IP,
  subnet: 0,
  universe: 0,
  port: 6454
});

console.log("🚀 Bridge configurado como RECEPTOR.");
console.log("📡 Escuchando Art-Net y enviando a:", RAILWAY_URL);

let lastSentTime = 0;
const throttleMs = 50; 

receiver.on('data', (data) => {
  const now = Date.now();
  
  if (now - lastSentTime > throttleMs) {
    // Tomamos los canales 1, 2 y 3 de Resolume
    const r = data[0]; 
    const g = data[1]; 
    const b = data[2];

    // Solo enviamos si el color no es negro total (para ahorrar tráfico si no hay show)
    // Opcional: quitar esta condición si quieres que el "negro" también se reporte constante
    const payload = { r, g, b, sentAt: now };

    axios.post(RAILWAY_URL, payload)
      .then(() => {
         console.log(`✅ Enviado a la web: R:${r} G:${g} B:${b}`);
      })
      .catch(err => {
         console.error("❌ Error enviando a Railway. Revisa la URL.");
      });

    lastSentTime = now;
  }
});