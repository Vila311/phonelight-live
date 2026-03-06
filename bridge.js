require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');
const inquirer = require('inquirer');

async function startBridge() {
  console.log("\n--- PHONELIGHT PRO: CONFIGURADOR DE GIRA ---");

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'URL de Railway:',
      default: process.env.RAILWAY_URL || "https://phonelight-live-production.up.railway.app/updateColor"
    },
    {
      type: 'input',
      name: 'ip',
      message: 'IP de escucha Art-Net:',
      default: process.env.INTERFACE_IP || "0.0.0.0"
    },
    {
      type: 'number',
      name: 'universe',
      message: 'Universo Art-Net (0-15):',
      default: 0
    }
  ]);

  const { url, ip, universe } = answers;
  const dmx = new dmxnet();
  
  const receiver = dmx.newReceiver({
    ip: ip,
    subnet: 0,
    universe: universe,
    port: 6454
  });

  console.log("\n------------------------------------------");
  console.log(`✅ RECEPTOR ART-NET ACTIVO | UNIVERSO: ${universe}`);
  console.log(`💓 HEARTBEAT: CADA 2s | FILTRO DE CAMBIO: ON`);
  console.log("------------------------------------------\n");

  let lastSentTime = 0;
  let lastColor = { r: -1, g: -1, b: -1 };
  
  // Variables para el contador PPS
  let packetsThisSecond = 0;
  let currentPPS = 0;

  // --- CONTADOR DE RENDIMIENTO (Cada 1 segundo) ---
  setInterval(() => {
    currentPPS = packetsThisSecond;
    packetsThisSecond = 0; // Resetear para el siguiente segundo
    if (currentPPS > 0) {
        process.stdout.write(`\r📊 Rendimiento: ${currentPPS} paquetes/seg | Estado: Estable    `);
    } else {
        process.stdout.write(`\r📊 Rendimiento: 0 paquetes/seg | Estado: Esperando Art-Net...`);
    }
  }, 1000);

  // --- LÓGICA DE HEARTBEAT (Latido) ---
  setInterval(() => {
    axios.post(url, { ...lastColor, type: 'heartbeat' })
      .catch(() => console.log("\n⚠️ Error: No se pudo enviar Heartbeat"));
  }, 2000);

  // --- ESCUCHA DE ART-NET ---
  receiver.on('data', (data) => {
    const now = Date.now();
    const r = data[0];
    const g = data[1];
    const b = data[2];

    const colorChanged = r !== lastColor.r || g !== lastColor.g || b !== lastColor.b;

    // Throttle de 45ms (aprox 22 fps max)
    if (colorChanged && (now - lastSentTime > 45)) {
      lastColor = { r, g, b };
      lastSentTime = now;
      packetsThisSecond++; // Aumentar contador para el PPS

      axios.post(url, { r, g, b, sentAt: now })
        .catch(err => {
          console.error("\n🔴 Error enviando cambio de color");
        });
    }
  });
}

startBridge();