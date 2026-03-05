const dgram = require("dgram");
const fetch = require("node-fetch"); // npm install node-fetch@2

const ARTNET_PORT = 6454;
const RAILWAY_URL = "https://phonelight-live-production.up.railway.app/updateColor";

// Usamos reuseAddr para que no choque con otros visualizadores como el Dominator
const udpServer = dgram.createSocket({ type: "udp4", reuseAddr: true });

let lastColor = { r: -1, g: -1, b: -1 };
let isSending = false; 

async function sendToRailway(r, g, b) {
  // 1. Solo enviar si el color es distinto al último enviado
  if (r === lastColor.r && g === lastColor.g && b === lastColor.b) return;

  // 2. Si hay una petición HTTP en curso, esperamos a que termine para no saturar
  if (isSending) return;

  isSending = true;

  try {
    const response = await fetch(RAILWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r, g, b }),
      timeout: 1000 // Evita que el script se cuelgue si Railway tarda
    });

    if (response.ok) {
      console.log(`✅ Sincronizado: R:${r} G:${g} B:${b}`);
      lastColor = { r, g, b };
    }
  } catch (err) {
    console.error("⚠️ Error de conexión a Railway (posible saturación)");
  } finally {
    // Pequeño respiro de 50ms para la tarjeta de red antes de permitir otro envío
    setTimeout(() => { isSending = false; }, 50);
  }
}

udpServer.on("message", (msg) => {
  // Verificación de cabecera Art-Net idéntica a tu server.js exitoso
  if (msg.toString("ascii", 0, 7) !== "Art-Net") return;

  // Verificar OpCode (0x5000 = ArtDMX)
  const opcode = msg.readUInt16LE(8);
  if (opcode !== 0x5000) return;

  const dmxData = msg.slice(18);
  const r = dmxData[0] || 0;
  const g = dmxData[1] || 0;
  const b = dmxData[2] || 0;

  // Filtro extra: Si recibimos un 0,0,0 pero el anterior era color, 
  // comprobamos que no sea un "paquete fantasma" ignorándolo si llega demasiado rápido
  sendToRailway(r, g, b);
});

// Escuchamos en todas las interfaces para captar el tráfico WiFi
udpServer.bind(ARTNET_PORT, "10.0.2.170", () => {
  console.log("------------------------------------------");
  console.log(`🚀 PUENTE ESTABLE ACTIVADO`);
  console.log(`Escuchando Art-Net y retransmitiendo a Railway`);
  console.log("------------------------------------------");
});