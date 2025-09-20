# 🔧 Configuración de Console Roast

Esta guía te ayudará a configurar tu API key de Anthropic para usar Console Roast.

## 📋 Pasos de Configuración

### 1. Obtener API Key de Anthropic

1. **Crear cuenta**: Ve a [Anthropic Console](https://console.anthropic.com/)
2. **Iniciar sesión**: Crea una cuenta o inicia sesión
3. **Generar API Key**: 
   - Ve a la sección "API Keys"
   - Haz clic en "Create Key"
   - Copia la clave generada (debe empezar con `sk-ant-`)

### 2. Configurar Variables de Entorno

#### Opción A: Usar archivo .env (Recomendado)

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar el archivo
nano .env  # o usa tu editor favorito
```

Agrega tu API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-api-key-aqui
```

#### Opción B: Variables de entorno del sistema

```bash
# Linux/macOS
export ANTHROPIC_API_KEY="sk-ant-api03-tu-api-key-aqui"

# Windows
set ANTHROPIC_API_KEY=sk-ant-api03-tu-api-key-aqui
```

### 3. Instalar Dependencias

```bash
npm install dotenv
```

### 4. Verificar Configuración

```bash
# Compilar proyecto
npm run build

# Probar configuración
npm run test-config

# Ejecutar ejemplo
npm run example:simple
```

## 🎛️ Opciones de Configuración

| Variable | Descripción | Valores | Defecto |
|----------|-------------|---------|---------|
| `ANTHROPIC_API_KEY` | API key de Anthropic | `sk-ant-...` | **Requerido** |
| `HUMOR_LEVEL` | Nivel de humor | `mild`, `medium`, `savage` | `medium` |
| `FREQUENCY` | % de logs con humor | `0-100` | `50` |
| `ENABLED` | Habilitar librería | `true`, `false` | `true` |
| `CACHE_SIZE` | Tamaño del cache | Número entero | `100` |
| `API_TIMEOUT` | Timeout en ms | `>= 1000` | `5000` |
| `FALLBACK_TO_LOCAL` | Usar humor local si API falla | `true`, `false` | `true` |

## 💻 Ejemplos de Uso

### Ejemplo Básico (JavaScript)

```javascript
require('dotenv').config();
const { AnthropicClient, EnvConfig } = require('roast-log');

// Cargar configuración desde .env
const config = EnvConfig.fromEnv();
const client = new AnthropicClient(config);

// Usar el cliente...
```

### Ejemplo Avanzado (TypeScript)

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { AnthropicClient, EnvConfig, ContentAnalysis } from 'roast-log';

async function main() {
  // Validar configuración
  const validation = EnvConfig.validateEnv();
  if (!validation.valid) {
    console.error('Errores:', validation.errors);
    return;
  }

  // Crear cliente
  const config = EnvConfig.fromEnv();
  const client = new AnthropicClient(config);

  // Generar humor
  const analysis: ContentAnalysis = {
    dataTypes: ['string'],
    complexity: 'simple',
    isError: false,
    sentiment: 'neutral',
    patterns: [],
    sanitizedContent: 'Hello world'
  };

  const result = await client.generateHumor('console.log("Hello world")', analysis);
  
  if (result.success) {
    console.log('Humor:', result.humor);
  }
}

main().catch(console.error);
```

## 🔍 Solución de Problemas

### Error: "ANTHROPIC_API_KEY is required"
- Verifica que el archivo `.env` existe
- Asegúrate de que la variable está definida
- Ejecuta `npm run test-config` para diagnosticar

### Error: "API Key no tiene el formato correcto"
- Las API keys de Anthropic deben empezar con `sk-ant-`
- Verifica que copiaste la clave completa

### Error: "Cliente no disponible"
- Verifica tu conexión a internet
- Comprueba que la API key es válida
- Revisa los logs para más detalles

### Error: "Cannot find module"
- Ejecuta `npm run build` para compilar el proyecto
- Verifica que todas las dependencias están instaladas

## 🚀 Scripts Disponibles

```bash
# Probar configuración
npm run test-config

# Ejemplos
npm run example          # Ejemplo completo (JS)
npm run example:ts       # Ejemplo completo (TS)
npm run example:simple   # Ejemplo simple (TS)

# Desarrollo
npm run build           # Compilar proyecto
npm test               # Ejecutar tests
npm run clean          # Limpiar archivos compilados
```

## 🔒 Seguridad

- **Nunca** commits tu API key al repositorio
- Usa archivos `.env` para desarrollo local
- En producción, usa variables de entorno del sistema
- Agrega `.env` a tu `.gitignore`

## 📞 Soporte

Si tienes problemas:

1. Ejecuta `npm run test-config` para diagnosticar
2. Revisa los logs de error
3. Verifica que tu API key es válida en [Anthropic Console](https://console.anthropic.com/)
4. Consulta la documentación de Anthropic

¡Ya estás listo para usar Console Roast! 🎉