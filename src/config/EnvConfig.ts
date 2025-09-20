import { ConsoleRoastConfig } from '../../types';

/**
 * Utility class for loading configuration from environment variables
 */
export class EnvConfig {
  /**
   * Load configuration from environment variables
   * Requires dotenv to be configured first
   */
  static fromEnv(): ConsoleRoastConfig {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY,
      humorLevel: this.parseHumorLevel(process.env.HUMOR_LEVEL),
      frequency: this.parseNumber(process.env.FREQUENCY, 50, 0, 100),
      enabled: this.parseBoolean(process.env.ENABLED, true),
      cacheSize: this.parseNumber(process.env.CACHE_SIZE, 100, 0),
      apiTimeout: this.parseNumber(process.env.API_TIMEOUT, 5000, 1000),
      fallbackToLocal: this.parseBoolean(process.env.FALLBACK_TO_LOCAL, true)
    };
  }

  /**
   * Parse humor level from string
   */
  private static parseHumorLevel(value?: string): 'mild' | 'medium' | 'savage' {
    const validLevels = ['mild', 'medium', 'savage'] as const;
    if (value && validLevels.includes(value as any)) {
      return value as 'mild' | 'medium' | 'savage';
    }
    return 'medium';
  }

  /**
   * Parse number from string with validation
   */
  private static parseNumber(value?: string, defaultValue: number = 0, min?: number, max?: number): number {
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    
    if (min !== undefined && parsed < min) return defaultValue;
    if (max !== undefined && parsed > max) return defaultValue;
    
    return parsed;
  }

  /**
   * Parse boolean from string
   */
  private static parseBoolean(value?: string, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  /**
   * Validate that required environment variables are set
   */
  static validateEnv(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.ANTHROPIC_API_KEY) {
      errors.push('ANTHROPIC_API_KEY is required');
    } else if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      errors.push('ANTHROPIC_API_KEY must start with "sk-ant-"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get example environment configuration
   */
  static getExampleEnv(): string {
    return `# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here

# Console Roast Configuration
HUMOR_LEVEL=medium
FREQUENCY=50
ENABLED=true
CACHE_SIZE=100
API_TIMEOUT=5000
FALLBACK_TO_LOCAL=true`;
  }
}