# roast-log 🔥

A Node.js library that enhances console.log with humorous comments and reactions, making debugging sessions more entertaining.

## Installation

```bash
npm install roast-log
```

## Configuration

### Configuración Rápida

1. **Obtener API Key**: Ve a [Anthropic Console](https://console.anthropic.com/) y genera una API key
2. **Configurar**: Copia `.env.example` a `.env` y agrega tu API key
3. **Probar**: Ejecuta `npm run test-config` para verificar

```bash
# Configuración rápida
cp .env.example .env
# Edita .env y agrega tu ANTHROPIC_API_KEY
npm install dotenv
npm run build
npm run test-config
```

📖 **[Ver guía completa de configuración →](SETUP.md)**

## Quick Start

```typescript
// Cargar variables de entorno
import * as dotenv from 'dotenv';
dotenv.config();

import { AnthropicClient, ConfigurationManager } from 'roast-log';

// Configuración
const config = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  humorLevel: 'medium' as const,
  frequency: 50,
  enabled: true,
  cacheSize: 100,
  apiTimeout: 5000,
  fallbackToLocal: true
};

// Crear cliente
const client = new AnthropicClient(config);

// Verificar disponibilidad
if (client.isAvailable()) {
  console.log('✅ Cliente configurado correctamente');
} else {
  console.log('❌ Verifica tu API key');
}
```

## Ejemplo Completo

```typescript
import { AnthropicClient, ContentAnalysis } from 'roast-log';

const client = new AnthropicClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  humorLevel: 'medium',
  frequency: 50,
  enabled: true,
  cacheSize: 100,
  apiTimeout: 5000,
  fallbackToLocal: true
});

// Análisis de contenido simulado
const analysis: ContentAnalysis = {
  dataTypes: ['string'],
  complexity: 'simple',
  isError: false,
  sentiment: 'neutral',
  patterns: [],
  sanitizedContent: 'Hello world!'
};

// Generar humor
const result = await client.generateHumor('console.log("Hello world!")', analysis);

if (result.success) {
  console.log('Humor generado:', result.humor);
} else {
  console.log('Error:', result.error);
}
```

## Features

- 🎭 Dynamic humor generation using Anthropic's API
- 🎯 Context-aware responses based on logged content
- ⚡ Minimal performance impact with intelligent caching
- 🔧 Configurable humor levels and frequency
- 🛡️ Automatic fallback to local humor when API is unavailable
- 📝 Full TypeScript support

## Documentation

Full documentation will be available once implementation is complete.

## Development

This project is currently under development. See the implementation tasks in `.kiro/specs/console-roast/tasks.md`.

## License

MIT