import { ConsoleRoastConfig, IConfigurationManager } from '../../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration Manager for Console.roast
 * Handles configuration validation, defaults, and loading from various sources
 */
export class ConfigurationManager implements IConfigurationManager {
  private config: ConsoleRoastConfig;
  private readonly defaultConfig: ConsoleRoastConfig = {
    humorLevel: 'medium',
    frequency: 50,
    enabled: true,
    cacheSize: 100,
    apiTimeout: 5000,
    fallbackToLocal: true
  };

  constructor(initialConfig?: Partial<ConsoleRoastConfig>) {
    this.config = { ...this.defaultConfig };
    
    // Load configuration from various sources in order of priority
    this.loadFromEnvironment();
    this.loadFromConfigFile();
    
    // Apply any provided initial configuration
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): ConsoleRoastConfig {
    return { ...this.config };
  }

  /**
   * Update configuration with new values
   * @param config Partial configuration to merge
   */
  updateConfig(config: Partial<ConsoleRoastConfig>): void {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration provided');
    }

    this.config = { ...this.config, ...config };
  }

  /**
   * Validate configuration values
   * @param config Configuration to validate
   * @returns True if configuration is valid
   */
  validateConfig(config: Partial<ConsoleRoastConfig>): boolean {
    try {
      // Validate humorLevel
      if (config.humorLevel !== undefined) {
        const validHumorLevels = ['mild', 'medium', 'savage'];
        if (!validHumorLevels.includes(config.humorLevel)) {
          console.error(`Invalid humorLevel: ${config.humorLevel}. Must be one of: ${validHumorLevels.join(', ')}`);
          return false;
        }
      }

      // Validate frequency
      if (config.frequency !== undefined) {
        if (!Number.isInteger(config.frequency) || config.frequency < 0 || config.frequency > 100) {
          console.error(`Invalid frequency: ${config.frequency}. Must be an integer between 0 and 100`);
          return false;
        }
      }

      // Validate enabled
      if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
        console.error(`Invalid enabled: ${config.enabled}. Must be a boolean`);
        return false;
      }

      // Validate cacheSize
      if (config.cacheSize !== undefined) {
        if (!Number.isInteger(config.cacheSize) || config.cacheSize < 0) {
          console.error(`Invalid cacheSize: ${config.cacheSize}. Must be a non-negative integer`);
          return false;
        }
      }

      // Validate apiTimeout
      if (config.apiTimeout !== undefined) {
        if (!Number.isInteger(config.apiTimeout) || config.apiTimeout < 1000) {
          console.error(`Invalid apiTimeout: ${config.apiTimeout}. Must be an integer >= 1000ms`);
          return false;
        }
      }

      // Validate fallbackToLocal
      if (config.fallbackToLocal !== undefined && typeof config.fallbackToLocal !== 'boolean') {
        console.error(`Invalid fallbackToLocal: ${config.fallbackToLocal}. Must be a boolean`);
        return false;
      }

      // Validate apiKey format if provided
      if (config.apiKey !== undefined) {
        if (typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
          console.error('Invalid apiKey: Must be a non-empty string');
          return false;
        }
        // Basic format validation for Anthropic API keys
        if (!config.apiKey.startsWith('sk-ant-')) {
          console.warn('API key does not match expected Anthropic format (should start with "sk-ant-")');
        }
      }

      return true;
    } catch (error) {
      console.error('Configuration validation error:', error);
      return false;
    }
  }

  /**
   * Load configuration from environment variables
   * Environment variables are prefixed with CONSOLE_ROAST_
   */
  private loadFromEnvironment(): void {
    const env = process.env;

    // Load API key
    if (env.CONSOLE_ROAST_API_KEY) {
      this.config.apiKey = env.CONSOLE_ROAST_API_KEY;
    }

    // Load humor level
    if (env.CONSOLE_ROAST_HUMOR_LEVEL) {
      const humorLevel = env.CONSOLE_ROAST_HUMOR_LEVEL.toLowerCase() as 'mild' | 'medium' | 'savage';
      if (['mild', 'medium', 'savage'].includes(humorLevel)) {
        this.config.humorLevel = humorLevel;
      }
    }

    // Load frequency
    if (env.CONSOLE_ROAST_FREQUENCY) {
      const frequency = parseInt(env.CONSOLE_ROAST_FREQUENCY, 10);
      if (!isNaN(frequency) && frequency >= 0 && frequency <= 100) {
        this.config.frequency = frequency;
      }
    }

    // Load enabled flag
    if (env.CONSOLE_ROAST_ENABLED) {
      this.config.enabled = env.CONSOLE_ROAST_ENABLED.toLowerCase() === 'true';
    }

    // Load cache size
    if (env.CONSOLE_ROAST_CACHE_SIZE) {
      const cacheSize = parseInt(env.CONSOLE_ROAST_CACHE_SIZE, 10);
      if (!isNaN(cacheSize) && cacheSize >= 0) {
        this.config.cacheSize = cacheSize;
      }
    }

    // Load API timeout
    if (env.CONSOLE_ROAST_API_TIMEOUT) {
      const apiTimeout = parseInt(env.CONSOLE_ROAST_API_TIMEOUT, 10);
      if (!isNaN(apiTimeout) && apiTimeout >= 1000) {
        this.config.apiTimeout = apiTimeout;
      }
    }

    // Load fallback to local flag
    if (env.CONSOLE_ROAST_FALLBACK_TO_LOCAL) {
      this.config.fallbackToLocal = env.CONSOLE_ROAST_FALLBACK_TO_LOCAL.toLowerCase() === 'true';
    }
  }

  /**
   * Load configuration from config files
   * Looks for .console-roast.json, console-roast.config.json, or package.json consoleRoast section
   */
  private loadFromConfigFile(): void {
    const configPaths = [
      '.console-roast.json',
      'console-roast.config.json',
      'package.json'
    ];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(process.cwd(), configPath);
        
        if (fs.existsSync(fullPath)) {
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          const parsedConfig = JSON.parse(fileContent);
          
          let config: Partial<ConsoleRoastConfig>;
          
          if (configPath === 'package.json') {
            // Look for consoleRoast section in package.json
            config = parsedConfig.consoleRoast || {};
          } else {
            config = parsedConfig;
          }

          if (Object.keys(config).length > 0 && this.validateConfig(config)) {
            this.config = { ...this.config, ...config };
            break; // Use the first valid config file found
          }
        }
      } catch (error) {
        // Silently continue to next config file if current one fails
        continue;
      }
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Get default configuration
   */
  getDefaults(): ConsoleRoastConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  /**
   * Get configuration as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load configuration from JSON string
   */
  fromJSON(json: string): void {
    try {
      const config = JSON.parse(json);
      if (this.validateConfig(config)) {
        this.config = { ...this.defaultConfig, ...config };
      } else {
        throw new Error('Invalid configuration in JSON');
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration JSON: ${error}`);
    }
  }
}