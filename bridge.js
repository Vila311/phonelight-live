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
      default: "10.0.3.4"
    }
  ]);

  const { url, ip } = answers;
  const dmx = new dmxnet();
  
  const receiver = dmx.newReceiver({
    ip: ip,
    subnet: 0,
    universe: 0,
    port: 6454
  });

  let lastSentTime = 0;
  let lastColor = { r: -1, g: -1, b: -1 };
  let packetsThisSecond = 0;

  // Contador de rendimiento en consola
  setInterval(() => {
    const status = packetsThisSecond > 0 ? 'ESTABLE' : 'ESPERANDO ART-NET';
    process.stdout.write(`\r📊 Rendimiento: ${packetsThisSecond} paquetes/seg | Estado: ${status}    `);
    packetsThisSecond = 0;
  }, 1000);

  // Heartbeat para mantener el servidor despierto
  setInterval(() => {
    axios.post(url, { ...lastColor, type: 'heartbeat' }).catch(() => {});
  }, 2000);

  receiver.on('data', (data) => {
    const r = data[0], g = data[1], b = data[2];
    const changed = r !== lastColor.r || g !== lastColor.g || b !== lastColor.b;

    if (changed && (Date.now() - lastSentTime > 45)) {
      lastColor = { r, g, b };
      lastSentTime = Date.now();
      packetsThisSecond++;
      axios.post(url, { r, g, b }).catch(() => {});
    }
  });
}

startBridge();