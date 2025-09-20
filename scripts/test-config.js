#!/usr/bin/env node

// Script para probar la configuración de Anthropic API
require('dotenv').config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkEnvironment() {
  log(colors.blue + colors.bold, '🔍 Verificando configuración...\n');

  // Verificar API Key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log(colors.red, '❌ ANTHROPIC_API_KEY no encontrada en .env');
    log(colors.yellow, '💡 Agrega tu API key al archivo .env:');
    log(colors.yellow, '   ANTHROPIC_API_KEY=tu-api-key-aqui');
    return false;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    log(colors.red, '❌ API Key no tiene el formato correcto');
    log(colors.yellow, '💡 Las API keys de Anthropic deben empezar con "sk-ant-"');
    return false;
  }

  log(colors.green, '✅ ANTHROPIC_API_KEY configurada correctamente');
  log(colors.blue, `   Formato: ${apiKey.substring(0, 15)}...`);

  // Verificar otras configuraciones
  const configs = {
    'HUMOR_LEVEL': process.env.HUMOR_LEVEL || 'medium',
    'FREQUENCY': process.env.FREQUENCY || '50',
    'ENABLED': process.env.ENABLED || 'true',
    'CACHE_SIZE': process.env.CACHE_SIZE || '100',
    'API_TIMEOUT': process.env.API_TIMEOUT || '5000',
    'FALLBACK_TO_LOCAL': process.env.FALLBACK_TO_LOCAL || 'true'
  };

  log(colors.blue, '\n📋 Configuración actual:');
  Object.entries(configs).forEach(([key, value]) => {
    log(colors.blue, `   ${key}: ${value}`);
  });

  return true;
}

async function testConnection() {
  try {
    // Importar después de verificar que existe la configuración
    const { AnthropicClient } = require('../dist/src/anthropic');
    
    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      humorLevel: process.env.HUMOR_LEVEL || 'medium',
      frequency: parseInt(process.env.FREQUENCY) || 50,
      enabled: process.env.ENABLED !== 'false',
      cacheSize: parseInt(process.env.CACHE_SIZE) || 100,
      apiTimeout: parseInt(process.env.API_TIMEOUT) || 5000,
      fallbackToLocal: process.env.FALLBACK_TO_LOCAL !== 'false'
    };

    const client = new AnthropicClient(config);

    if (!client.isAvailable()) {
      log(colors.red, '❌ Cliente no disponible');
      return false;
    }

    log(colors.green, '\n✅ Cliente inicializado correctamente');
    
    // Mostrar estado
    const rateLimitStatus = client.getRateLimitStatus();
    const circuitBreakerStatus = client.getCircuitBreakerStatus();
    
    log(colors.blue, `📊 Rate limit: ${rateLimitStatus.remaining} requests restantes`);
    log(colors.blue, `🔧 Circuit breaker: ${circuitBreakerStatus.state}`);

    return true;
  } catch (error) {
    log(colors.red, `❌ Error al probar conexión: ${error.message}`);
    if (error.message.includes('Cannot find module')) {
      log(colors.yellow, '💡 Ejecuta "npm run build" primero para compilar el proyecto');
    }
    return false;
  }
}

async function main() {
  log(colors.blue + colors.bold, '🚀 Test de Configuración - Console Roast\n');

  // Verificar configuración
  if (!checkEnvironment()) {
    process.exit(1);
  }

  // Probar conexión
  log(colors.blue + colors.bold, '\n🔌 Probando conexión...');
  const connectionOk = await testConnection();

  if (connectionOk) {
    log(colors.green + colors.bold, '\n🎉 ¡Todo configurado correctamente!');
    log(colors.blue, 'Ya puedes usar Console Roast con tu API key de Anthropic.');
  } else {
    log(colors.red + colors.bold, '\n❌ Hay problemas con la configuración');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(colors.red, `❌ Error inesperado: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { checkEnvironment, testConnection };