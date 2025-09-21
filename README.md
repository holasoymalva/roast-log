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

### Simple Usage (Default Configuration)

```typescript
import ConsoleRoast from 'roast-log';

// One-liner setup with defaults
const roast = new ConsoleRoast();

// Now all console.log calls will be enhanced with humor
console.log('Hello, world!');
console.log('This is working!');
console.log('Error: Something went wrong');

// Cleanup when done
roast.cleanup();
```

### Advanced Configuration

```typescript
import ConsoleRoast from 'roast-log';

// Custom configuration
const roast = new ConsoleRoast({
  apiKey: process.env.ANTHROPIC_API_KEY, // Optional: for AI-generated humor
  humorLevel: 'savage', // 'mild', 'medium', or 'savage'
  frequency: 75, // Apply humor to 75% of logs
  enabled: true,
  cacheSize: 50,
  fallbackToLocal: true
});

console.log('This will have savage humor!');

// Change configuration on the fly
roast.configure({ humorLevel: 'mild' });
console.log('This will have mild humor');

// Disable temporarily
roast.disable();
console.log('This is normal logging');

// Re-enable
roast.enable();
console.log('Humor is back!');

// Get status and metrics
console.log('Status:', roast.getStatus());
console.log('Metrics:', roast.getMetrics());

// Cleanup
roast.cleanup();
```

## API Reference

### ConsoleRoast Class

```typescript
class ConsoleRoast {
  constructor(config?: Partial<ConsoleRoastConfig>)
  
  // Control methods
  enable(): void
  disable(): void
  configure(config: Partial<ConsoleRoastConfig>): void
  cleanup(): void
  
  // Information methods
  getConfig(): ConsoleRoastConfig
  isCurrentlyEnabled(): boolean
  getMetrics(): PerformanceMetrics
  getStatus(): StatusInfo
  
  // Cache management
  clearCache(): void
  resetStats(): void
}
```

### Configuration Options

```typescript
interface ConsoleRoastConfig {
  apiKey?: string;                    // Anthropic API key (optional)
  humorLevel: 'mild' | 'medium' | 'savage';  // Humor intensity
  frequency: number;                  // Percentage of logs to enhance (0-100)
  enabled: boolean;                   // Whether library is active
  cacheSize: number;                  // Maximum cached responses
  apiTimeout: number;                 // API request timeout (ms)
  fallbackToLocal: boolean;          // Use local humor when API fails
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