require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

const args = process.argv.slice(2);
const ipManual = args[0] || "0.0.0.0";
const subnetManual = parseInt(args[1]) || 0;
const universeManual = parseInt(args[2]) || 0;

// CAMBIA ESTA URL POR LA DE TU RAMA EN RAILWAY
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
console.log(`🎨 Modo: RGBA (4 canales por zona)`);

let lastSentData = {};

// Heartbeat cada 3 segundos para mantener el estado "ACTIVO"
setInterval(() => {
    axios.post(url, { type: 'heartbeat' }).catch(() => {});
}, 3000);

receiver.on('data', (data) => {
    const getRGBAColor = (startIndex) => {
        const r = data[startIndex] || 0;
        const g = data[startIndex + 1] || 0;
        const b = data[startIndex + 2] || 0;
        const alpha = (data[startIndex + 3] !== undefined ? data[startIndex + 3] : 255) / 255;

        return {
            r: Math.round(r * alpha),
            g: Math.round(g * alpha),
            b: Math.round(b * alpha)
        };
    };

    const currentData = {
        "A1": getRGBAColor(0),  // Canales 1-4
        "A2": getRGBAColor(4),  // Canales 5-8
        "B1": getRGBAColor(8),  // Canales 9-12
        "B2": getRGBAColor(12), // Canales 13-16
        "B3": getRGBAColor(16), // Canales 17-20
        "B4": getRGBAColor(20)  // Canales 21-24
    };

    if (JSON.stringify(currentData) !== JSON.stringify(lastSentData)) {
        lastSentData = currentData;
        axios.post(url, currentData)
            .then(() => console.log("🎨 Datos DMX enviados"))
            .catch(e => console.log("⚠️ Error de conexión con Railway"));
    }
});