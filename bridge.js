const dgram = require("dgram");
const fetch = require("node-fetch"); // npm install node-fetch@2

// Ajusta a tu puerto Art-Net
const ARTNET_PORT = 6454;

// URL de tu servidor en Railway
const RAILWAY_URL = "https://phonelight-live-production.up.railway.app/updateColor";

// Socket UDP para Art-Net
const udpServer = dgram.createSocket("udp4");

// Guardar último color para no spamear la web
let lastColor = { r: -1, g: -1, b: -1 };

udpServer.on("message", async (msg, rinfo) => {
  // Verificar paquete Art-Net
  if (msg.toString("ascii", 0, 7) !== "Art-Net") return;

  const dmxData = msg.slice(18); // Datos DMX empiezan en byte 18
  const r = dmxData[0] || 0;
  const g = dmxData[1] || 0;
  const b = dmxData[2] || 0;

  // Evitar enviar el mismo color repetido
  if (r === lastColor.r && g === lastColor.g && b === lastColor.b) return;
  lastColor = { r, g, b };

  console.log(`🎛 DMX recibido → R=${r} G=${g} B=${b}`);

  // Enviar color a la web en Railway
  try {
    await fetch(RAILWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r, g, b })
    });
  } catch (err) {
    console.error("❌ Error enviando color a Railway:", err.message);
  }
});

udpServer.bind(ARTNET_PORT, () => {
  console.log(`🎛 Escuchando Art-Net en puerto ${ARTNET_PORT}`);
});