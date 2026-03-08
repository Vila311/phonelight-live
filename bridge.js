require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');
const inquirer = require('inquirer');
const fs = require('fs');

const CONFIG_FILE = './last_config.json';

// Cargar configuración previa si existe
let savedConfig = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
  } catch (e) {
    savedConfig = {};
  }
}

async function startBridge() {
  console.log("\n--- PHONELIGHT PRO: CONFIGURADOR DE GIRA (DIMMER READY) ---");

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'URL de Railway:',
      default: savedConfig.url || process.env.RAILWAY_URL || "https://phonelight-live-production.up.railway.app/updateColor"
    },
    {
      type: 'input',
      name: 'ip',
      message: 'IP de escucha Art-Net (Tu IP 2.0.0.230 o 0.0.0.0):',
      default: savedConfig.ip || "0.0.0.0"
    },
    {
      type: 'number',
      name: 'subnet',
      message: 'Introduce la Subnet (0-15):',
      default: savedConfig.subnet !== undefined ? savedConfig.subnet : 0
    },
    {
      type: 'number',
      name: 'universe',
      message: 'Introduce el Universo (0-15):',
      default: savedConfig.universe !== undefined ? savedConfig.universe : 0
    }
  ]);

  // Guardar configuración para la próxima sesión
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(answers));

  const { url, ip, subnet, universe } = answers;
  const dmx = new dmxnet();
  
  const receiver = dmx.newReceiver({
    ip: ip,
    subnet: subnet,
    universe: universe,
    port: 6454
  });

  console.log("\n------------------------------------------");
  console.log(`✅ RECEPTOR ACTIVO | ESCUCHANDO EN ${ip}`);
  console.log(`📡 RUTA: Subnet ${subnet} | Universo ${universe}`);
  console.log(`🎭 MAPEO: CH1: Dimmer | CH2: R | CH3: G | CH4: B`);
  console.log("------------------------------------------\n");

  let lastSentTime = 0;
  let lastColor = { r: -1, g: -1, b: -1 };
  let packetsThisSecond = 0;

  // Monitor de rendimiento en consola
  setInterval(() => {
    const status = packetsThisSecond > 0 ? 'RECIBIENDO' : 'ESPERANDO MA3...';
    process.stdout.write(`\r📊 Rendimiento: ${packetsThisSecond} paquetes/seg | Estado: ${status}    `);
    packetsThisSecond = 0;
  }, 1000);

  // Sistema de Latido (Heartbeat) para evitar el apagado del servidor
  setInterval(() => {
    axios.post(url, { ...lastColor, type: 'heartbeat' }).catch(() => {});
  }, 2000);

  receiver.on('data', (data) => {
    // LÓGICA DE DIMMER
    // data[0] = Canal 1 (Dimmer)
    // data[1] = Canal 2 (Rojo)
    // data[2] = Canal 3 (Verde)
    // data[3] = Canal 4 (Azul)

    const dimmerFactor = data[0] / 255; // Convertimos de 0-255 a 0.0-1.0
    
    // Aplicamos el factor de intensidad a cada canal de color
    const r = Math.round(data[1] * dimmerFactor);
    const g = Math.round(data[2] * dimmerFactor);
    const b = Math.round(data[3] * dimmerFactor);

    // Solo enviamos si el color resultante ha cambiado realmente
    const changed = r !== lastColor.r || g !== lastColor.g || b !== lastColor.b;

    // Filtro de tiempo para no saturar la red (máximo ~22 envíos/seg)
    if (changed && (Date.now() - lastSentTime > 45)) {
      lastColor = { r, g, b };
      lastSentTime = Date.now();
      packetsThisSecond++;
      
      // Enviamos el color final procesado a la nube
      axios.post(url, { r, g, b, sentAt: lastSentTime }).catch(() => {});
    }
  });
}

startBridge();