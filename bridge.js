// bridge.js - VERSIÓN MULTIZONA PARA ESTADIO
require('dotenv').config();
const { dmxnet } = require('dmxnet');
const axios = require('axios');

const url = "https://tu-url-de-railway.app/updateColor"; // Cambia esto por tu URL real
const dmx = new dmxnet();

const receiver = dmx.newReceiver({
  ip: "0.0.0.0",
  subnet: 0,
  universe: 0,
  port: 6454
});

console.log("🚀 BRIDGE MULTIZONA INICIADO");
console.log("Mapeo: A1(CH1), A2(CH5), B1(CH9), B2(CH13), B3(CH17), B4(CH21)");

let lastSentData = {};

receiver.on('data', (data) => {
  // Función para extraer color + dimmer de un bloque de 4 canales
  const getZoneColor = (startIndex) => {
    const dimmer = data[startIndex] / 255;
    return {
      r: Math.round(data[startIndex + 1] * dimmer),
      g: Math.round(data[startIndex + 2] * dimmer),
      b: Math.round(data[startIndex + 3] * dimmer)
    };
  };

  // Construimos el paquete para todas las zonas
  const currentData = {
    "A1": getZoneColor(0),  // CH 1, 2, 3, 4
    "A2": getZoneColor(4),  // CH 5, 6, 7, 8
    "B1": getZoneColor(8),  // CH 9, 10, 11, 12
    "B2": getZoneColor(12), // CH 13, 14, 15, 16
    "B3": getZoneColor(16), // CH 17, 18, 19, 20
    "B4": getZoneColor(20)  // CH 21, 22, 23, 24
  };

  // Comparamos si algo ha cambiado (para no saturar la red)
  if (JSON.stringify(currentData) !== JSON.stringify(lastSentData)) {
    lastSentData = currentData;
    axios.post(url, currentData).catch(e => console.log("Error envío:", e.message));
  }
});