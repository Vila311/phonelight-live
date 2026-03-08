require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

// Capturar argumentos
const args = process.argv.slice(2);
const ipManual = args[0] || "0.0.0.0";
const subnetManual = parseInt(args[1]) || 0;
const universeManual = parseInt(args[2]) || 0;
const url = args[3];

if (!url || !url.startsWith('http')) {
    console.error("❌ ERROR: URL de Railway no válida.");
    process.exit(1);
}

const dmx = new dmxnet();
const receiver = dmx.newReceiver({
    ip: ipManual,
    subnet: subnetManual,
    universe: universeManual,
    port: 6454
});

console.log(`\n🚀 BRIDGE CONECTADO`);
console.log(`📡 Art-Net: ${ipManual} | Universo: ${subnetManual}:${universeManual}`);
console.log(`🔗 Enviando a: ${url}\n`);

// EVITAR QUE EL PROGRAMA SE CIERRE POR ERRORES DE RED
process.on('uncaughtException', (err) => {
    console.error('⚠️ Error inesperado (pero no me cerraré):', err.message);
});

let lastSentData = {};

// Heartbeat (Latido)
setInterval(async () => {
    try {
        await axios.post(url, { type: 'heartbeat' }, { timeout: 2000 });
        console.log("💓 Latido OK");
    } catch (e) {
        console.log("❌ Error de conexión: Railway no responde en esa URL.");
    }
}, 3000);

receiver.on('data', async (data) => {
    try {
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
    } catch (err) {
        // Ignorar errores de procesamiento DMX para no saturar la consola
    }
});