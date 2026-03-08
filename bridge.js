require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

const args = process.argv.slice(2);
const ipManual = args[0] || "0.0.0.0";
const subnetManual = parseInt(args[1]) || 0;
const universeManual = parseInt(args[2]) || 0;

// SUSTITUYE CON TU URL DE RAILWAY
const url = "https://phonelight-live-production.up.railway.app/updateColor"; 
const dmx = new dmxnet();

const receiver = dmx.newReceiver({
  ip: ipManual,
  subnet: subnetManual,
  universe: universeManual,
  port: 6454
});

console.log(`🚀 BRIDGE CONECTADO`);
console.log(`📡 Escuchando en: ${ipManual} | Subnet: ${subnetManual} | Universo: ${universeManual}`);
console.log(`🎨 Modo: RGBA (Canal 4 = Dimmer)`);

let lastSentData = {};

// HEARTBEAT: Avisa al servidor cada 3 segundos que estamos online
setInterval(() => {
    axios.post(url, { type: 'heartbeat' }).catch(() => {});
}, 3000);

receiver.on('data', (data) => {
  
  const getRGBAColor = (startIndex) => {
    const rBase = data[startIndex] || 0;
    const gBase = data[startIndex + 1] || 0;
    const bBase = data[startIndex + 2] || 0;
    const alpha = (data[startIndex + 3] !== undefined ? data[startIndex + 3] : 255) / 255;

    return {
      r: Math.round(rBase * alpha),
      g: Math.round(gBase * alpha),
      b: Math.round(bBase * alpha)
    };
  };

  // MAPEADO CORREGIDO (Incrementos de 4 en 4 reales)
  const currentData = {
    "A1": getRGBAColor(0),  // CH 1-4
    "A2": getRGBAColor(4),  // CH 5-8
    "B1": getRGBAColor(8),  // CH 9-12
    "B2": getRGBAColor(12), // CH 13-16
    "B3": getRGBAColor(16), // CH 17-20
    "B4": getRGBAColor(20)  // CH 21-24 (Antes tenías 24, ahora es 20)
  };

  // Solo enviamos si hay cambios reales en los colores
  if (JSON.stringify(currentData) !== JSON.stringify(lastSentData)) {
    lastSentData = currentData;
    axios.post(url, currentData).catch(e => {
        console.log("⚠️ Error de conexión con Railway");
    });
  }
});