require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

// ─── ARGUMENTOS ───────────────────────────────────────────────────────────────
// Uso: node bridge.js <ip> <subnet> <universe> <url_railway>
// Ejemplo: node bridge.js 2.0.0.1 0 0 https://mi-app.railway.app/updateColor
const args = process.argv.slice(2);
const ipManual      = args[0] || "0.0.0.0";
const subnetManual  = parseInt(args[1]) || 0;
const universeManual= parseInt(args[2]) || 0;
const url           = args[3] || process.env.RAILWAY_URL;

if (!url || !url.startsWith('http')) {
    console.error("❌ ERROR: URL de Railway no válida.");
    console.error("   Uso: node bridge.js <ip> <subnet> <universe> <url>");
    process.exit(1);
}

// ─── TOKEN DE SEGURIDAD (debe coincidir con server.js) ────────────────────────
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || 'phonelight-secret-2024';

// ─── CABECERAS COMUNES ────────────────────────────────────────────────────────
const HEADERS = {
    'Content-Type': 'application/json',
    'x-bridge-token': BRIDGE_SECRET
};

// ─── CLIENTE HTTP CON TIMEOUT ─────────────────────────────────────────────────
const http = axios.create({
    timeout: 3000,
    headers: HEADERS
});

// ─── ART-NET ──────────────────────────────────────────────────────────────────
const dmx = new dmxnet();
const receiver = dmx.newReceiver({
    ip: ipManual,
    subnet: subnetManual,
    universe: universeManual,
    port: 6454
});

console.log(`\n🚀 BRIDGE CONECTADO`);
console.log(`📡 Art-Net: ${ipManual} | Universo: ${subnetManual}:${universeManual}`);
console.log(`🔗 Enviando a: ${url}`);
console.log(`🔐 Token: ${BRIDGE_SECRET.slice(0, 4)}****\n`);

// ─── EVITAR CIERRES POR ERRORES DE RED ───────────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('⚠️ Error inesperado:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Promesa rechazada:', reason?.message || reason);
});

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let lastSentData = {};
let heartbeatOk = false;
let dmxFrameCount = 0;

// ─── HEARTBEAT ────────────────────────────────────────────────────────────────
setInterval(async () => {
    try {
        await http.post(url, { type: 'heartbeat' });
        if (!heartbeatOk) {
            console.log("✅ Conexión con Railway establecida");
            heartbeatOk = true;
        }
        console.log(`💓 Latido OK | DMX frames procesados: ${dmxFrameCount}`);
        dmxFrameCount = 0;
    } catch (e) {
        heartbeatOk = false;
        if (e.response) {
            // El servidor respondió con error HTTP
            console.error(`❌ Railway respondió ${e.response.status}: ${e.response.statusText}`);
            if (e.response.status === 401) {
                console.error("🔐 Token incorrecto. Revisa BRIDGE_SECRET en .env");
            }
        } else {
            console.error(`❌ Sin respuesta de Railway: ${e.message}`);
        }
    }
}, 3000);

// ─── PROCESAMIENTO DMX ────────────────────────────────────────────────────────
const getRGBAColor = (data, startIndex) => {
    const r     = data[startIndex]     || 0;
    const g     = data[startIndex + 1] || 0;
    const b     = data[startIndex + 2] || 0;
    const alpha = (data[startIndex + 3] !== undefined ? data[startIndex + 3] : 255) / 255;
    return {
        r: Math.round(r * alpha),
        g: Math.round(g * alpha),
        b: Math.round(b * alpha)
    };
};

// Mapeo de zonas a offsets DMX (canal base -1 por ser índice 0)
const ZONE_MAP = {
    "A1": 0,  // Canales 1-4
    "A2": 4,  // Canales 5-8
    "B1": 8,  // Canales 9-12
    "B2": 12, // Canales 13-16
    "B3": 16, // Canales 17-20
    "B4": 20  // Canales 21-24
};

receiver.on('data', async (data) => {
    try {
        dmxFrameCount++;

        const currentData = {};
        Object.entries(ZONE_MAP).forEach(([zone, offset]) => {
            currentData[zone] = getRGBAColor(data, offset);
        });

        // Solo enviar si hay cambios reales
        if (JSON.stringify(currentData) === JSON.stringify(lastSentData)) return;

        lastSentData = currentData;

        // Fire & forget — no bloquear el hilo DMX esperando respuesta
        http.post(url, currentData).catch((e) => {
            if (e.response?.status === 401) {
                console.error("🔐 Token rechazado por el servidor");
            }
            // Otros errores de red se ignoran silenciosamente para no saturar
        });

    } catch (err) {
        console.error('⚠️ Error procesando DMX:', err.message);
    }
});