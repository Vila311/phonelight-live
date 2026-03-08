require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

const args = process.argv.slice(2);
const ipManual = args[0] || "0.0.0.0";
const subnetManual = parseInt(args[1]) || 0;
const universeManual = parseInt(args[2]) || 0;

// REEMPLAZA ESTO CON LA URL QUE VES EN TU NAVEGADOR (CON LA RAMA FEATURE)
const url = "https:/phonelight-live-production.up.railway.app/updateColor";
const dmx = new dmxnet();

const receiver = dmx.newReceiver({
    ip: ipManual,
    subnet: subnetManual,
    universe: universeManual,
    port: 6454
});

console.log(`🚀 BRIDGE CONECTADO`);
console.log(`📡 Escuchando en: ${ipManual} | Subnet: ${subnetManual} | Universo: ${universeManual}`);

let lastSentData = {};

// Heartbeat cada 3 segundos
setInterval(() => {
    axios.post(url, { type: 'heartbeat' })
        .then(() => console.log("💓 Latido enviado"))
        .catch(e => console.log("⚠️ Error de conexión"));
}, 3000);

receiver.on('data', (data) => {
    const getRGBAColor = (startIndex) => {
        const r = data[startIndex] || 0;
        const g = data[startIndex + 1] || 0;
        const b = data[startIndex + 2] || 0;
        const alpha = (data[startIndex + 3] !== undefined ? data[startIndex + 3] : 255) / 255;
        return { r: Math.round(r * alpha), g: Math.round(g * alpha), b: Math.round(b * alpha) };
    };

    const currentData = {
        "A1": getRGBAColor(0), "A2": getRGBAColor(4),
        "B1": getRGBAColor(8), "B2": getRGBAColor(12),
        "B3": getRGBAColor(16), "B4": getRGBAColor(20)
    };

    if (JSON.stringify(currentData) !== JSON.stringify(lastSentData)) {
        lastSentData = currentData;
        axios.post(url, currentData).catch(() => {});
    }
});