import { ConfigurationManager } from '../../src/config/ConfigurationManager';
import { ConsoleRoastConfig } from '../../types/index';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.CONSOLE_ROAST_API_KEY;
    delete process.env.CONSOLE_ROAST_HUMOR_LEVEL;
    delete process.env.CONSOLE_ROAST_FREQUENCY;
    delete process.env.CONSOLE_ROAST_ENABLED;
    delete process.env.CONSOLE_ROAST_CACHE_SIZE;
    delete process.env.CONSOLE_ROAST_API_TIMEOUT;
    delete process.env.CONSOLE_ROAST_FALLBACK_TO_LOCAL;

    // Reset fs mocks
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should initialize with default configuration', () => {
      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config).toEqual({
        humorLevel: 'medium',
        frequency: 50,
        enabled: true,
        cacheSize: 100,
        apiTimeout: 5000,
        fallbackToLocal: true
      });
    });

    it('should provide access to default configuration', () => {
      configManager = new ConfigurationManager();
      const defaults = configManager.getDefaults();

      expect(defaults).toEqual({
        humorLevel: 'medium',
        frequency: 50,
        enabled: true,
        cacheSize: 100,
        apiTimeout: 5000,
        fallbackToLocal: true
      });
    });

    it('should reset to defaults', () => {
      configManager = new ConfigurationManager();
      configManager.updateConfig({ humorLevel: 'savage', frequency: 100 });
      
      configManager.resetToDefaults();
      const config = configManager.getConfig();

      expect(config).toEqual({
        humorLevel: 'medium',
        frequency: 50,
        enabled: true,
        cacheSize: 100,
        apiTimeout: 5000,
        fallbackToLocal: true
      });
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      configManager = new ConfigurationManager();
    });

    it('should validate valid humor levels', () => {
      expect(configManager.validateConfig({ humorLevel: 'mild' })).toBe(true);
      expect(configManager.validateConfig({ humorLevel: 'medium' })).toBe(true);
      expect(configManager.validateConfig({ humorLevel: 'savage' })).toBe(true);
    });

    it('should reject invalid humor levels', () => {
      expect(configManager.validateConfig({ humorLevel: 'invalid' as any })).toBe(false);
      expect(configManager.validateConfig({ humorLevel: '' as any })).toBe(false);
    });

    it('should validate frequency range', () => {
      expect(configManager.validateConfig({ frequency: 0 })).toBe(true);
      expect(configManager.validateConfig({ frequency: 50 })).toBe(true);
      expect(configManager.validateConfig({ frequency: 100 })).toBe(true);
    });

    it('should reject invalid frequency values', () => {
      expect(configManager.validateConfig({ frequency: -1 })).toBe(false);
      expect(configManager.validateConfig({ frequency: 101 })).toBe(false);
      expect(configManager.validateConfig({ frequency: 50.5 })).toBe(false);
      expect(configManager.validateConfig({ frequency: NaN })).toBe(false);
    });

    it('should validate boolean fields', () => {
      expect(configManager.validateConfig({ enabled: true })).toBe(true);
      expect(configManager.validateConfig({ enabled: false })).toBe(true);
      expect(configManager.validateConfig({ fallbackToLocal: true })).toBe(true);
      expect(configManager.validateConfig({ fallbackToLocal: false })).toBe(true);
    });

    it('should reject invalid boolean fields', () => {
      expect(configManager.validateConfig({ enabled: 'true' as any })).toBe(false);
      expect(configManager.validateConfig({ fallbackToLocal: 1 as any })).toBe(false);
    });

    it('should validate cache size', () => {
      expect(configManager.validateConfig({ cacheSize: 0 })).toBe(true);
      expect(configManager.validateConfig({ cacheSize: 100 })).toBe(true);
      expect(configManager.validateConfig({ cacheSize: 1000 })).toBe(true);
    });

    it('should reject invalid cache size', () => {
      expect(configManager.validateConfig({ cacheSize: -1 })).toBe(false);
      expect(configManager.validateConfig({ cacheSize: 50.5 })).toBe(false);
      expect(configManager.validateConfig({ cacheSize: NaN })).toBe(false);
    });

    it('should validate API timeout', () => {
      expect(configManager.validateConfig({ apiTimeout: 1000 })).toBe(true);
      expect(configManager.validateConfig({ apiTimeout: 5000 })).toBe(true);
      expect(configManager.validateConfig({ apiTimeout: 10000 })).toBe(true);
    });

    it('should reject invalid API timeout', () => {
      expect(configManager.validateConfig({ apiTimeout: 999 })).toBe(false);
      expect(configManager.validateConfig({ apiTimeout: 1000.5 })).toBe(false);
      expect(configManager.validateConfig({ apiTimeout: NaN })).toBe(false);
    });

    it('should validate API key format', () => {
      expect(configManager.validateConfig({ apiKey: 'sk-ant-valid-key' })).toBe(true);
      expect(configManager.validateConfig({ apiKey: 'some-other-key' })).toBe(true); // Should warn but not fail
    });

    it('should reject invalid API keys', () => {
      expect(configManager.validateConfig({ apiKey: '' })).toBe(false);
      expect(configManager.validateConfig({ apiKey: '   ' })).toBe(false);
      expect(configManager.validateConfig({ apiKey: 123 as any })).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      configManager = new ConfigurationManager();
    });

    it('should update configuration with valid values', () => {
      const updates: Partial<ConsoleRoastConfig> = {
        humorLevel: 'savage',
        frequency: 75,
        enabled: false
      };

      configManager.updateConfig(updates);
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('savage');
      expect(config.frequency).toBe(75);
      expect(config.enabled).toBe(false);
      // Other values should remain default
      expect(config.cacheSize).toBe(100);
      expect(config.apiTimeout).toBe(5000);
    });

    it('should throw error for invalid configuration updates', () => {
      expect(() => {
        configManager.updateConfig({ frequency: -1 });
      }).toThrow('Invalid configuration provided');

      expect(() => {
        configManager.updateConfig({ humorLevel: 'invalid' as any });
      }).toThrow('Invalid configuration provided');
    });

    it('should return a copy of configuration to prevent external mutation', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same values

      config1.frequency = 999;
      expect(configManager.getConfig().frequency).toBe(50); // Original unchanged
    });
  });

  describe('Environment Variable Loading', () => {
    it('should load configuration from environment variables', () => {
      process.env.CONSOLE_ROAST_API_KEY = 'sk-ant-test-key';
      process.env.CONSOLE_ROAST_HUMOR_LEVEL = 'savage';
      process.env.CONSOLE_ROAST_FREQUENCY = '75';
      process.env.CONSOLE_ROAST_ENABLED = 'false';
      process.env.CONSOLE_ROAST_CACHE_SIZE = '200';
      process.env.CONSOLE_ROAST_API_TIMEOUT = '8000';
      process.env.CONSOLE_ROAST_FALLBACK_TO_LOCAL = 'false';

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.apiKey).toBe('sk-ant-test-key');
      expect(config.humorLevel).toBe('savage');
      expect(config.frequency).toBe(75);
      expect(config.enabled).toBe(false);
      expect(config.cacheSize).toBe(200);
      expect(config.apiTimeout).toBe(8000);
      expect(config.fallbackToLocal).toBe(false);
    });

    it('should ignore invalid environment variable values', () => {
      process.env.CONSOLE_ROAST_HUMOR_LEVEL = 'invalid';
      process.env.CONSOLE_ROAST_FREQUENCY = 'not-a-number';
      process.env.CONSOLE_ROAST_CACHE_SIZE = '-1';
      process.env.CONSOLE_ROAST_API_TIMEOUT = '500';

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      // Should use defaults for invalid values
      expect(config.humorLevel).toBe('medium');
      expect(config.frequency).toBe(50);
      expect(config.cacheSize).toBe(100);
      expect(config.apiTimeout).toBe(5000);
    });

    it('should handle boolean environment variables correctly', () => {
      process.env.CONSOLE_ROAST_ENABLED = 'TRUE';
      process.env.CONSOLE_ROAST_FALLBACK_TO_LOCAL = 'False';

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.fallbackToLocal).toBe(false);
    });
  });

  describe('Configuration File Loading', () => {
    it('should load from .console-roast.json', () => {
      const configData = {
        humorLevel: 'mild',
        frequency: 25,
        apiKey: 'sk-ant-file-key'
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().endsWith('.console-roast.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configData));

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('mild');
      expect(config.frequency).toBe(25);
      expect(config.apiKey).toBe('sk-ant-file-key');
    });

    it('should load from console-roast.config.json', () => {
      const configData = {
        humorLevel: 'savage',
        cacheSize: 500
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().endsWith('console-roast.config.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configData));

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('savage');
      expect(config.cacheSize).toBe(500);
    });

    it('should load from package.json consoleRoast section', () => {
      const packageData = {
        name: 'test-package',
        consoleRoast: {
          humorLevel: 'mild',
          frequency: 80
        }
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().endsWith('package.json');
      });
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(packageData));

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('mild');
      expect(config.frequency).toBe(80);
    });

    it('should handle missing config files gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      // Should use defaults
      expect(config).toEqual({
        humorLevel: 'medium',
        frequency: 50,
        enabled: true,
        cacheSize: 100,
        apiTimeout: 5000,
        fallbackToLocal: true
      });
    });

    it('should handle invalid JSON in config files gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      // Should use defaults when JSON is invalid
      expect(config).toEqual({
        humorLevel: 'medium',
        frequency: 50,
        enabled: true,
        cacheSize: 100,
        apiTimeout: 5000,
        fallbackToLocal: true
      });
    });
  });

  describe('Initial Configuration Override', () => {
    it('should apply initial configuration on construction', () => {
      const initialConfig: Partial<ConsoleRoastConfig> = {
        humorLevel: 'savage',
        frequency: 90,
        apiKey: 'sk-ant-initial-key'
      };

      configManager = new ConfigurationManager(initialConfig);
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('savage');
      expect(config.frequency).toBe(90);
      expect(config.apiKey).toBe('sk-ant-initial-key');
      // Defaults should be preserved for other values
      expect(config.enabled).toBe(true);
      expect(config.cacheSize).toBe(100);
    });

    it('should validate initial configuration', () => {
      expect(() => {
        new ConfigurationManager({ frequency: -1 });
      }).toThrow('Invalid configuration provided');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      configManager = new ConfigurationManager();
    });

    it('should check if API key is configured', () => {
      expect(configManager.hasApiKey()).toBe(false);

      configManager.updateConfig({ apiKey: 'sk-ant-test-key' });
      expect(configManager.hasApiKey()).toBe(true);

      // Reset to test empty key scenario
      configManager.resetToDefaults();
      expect(configManager.hasApiKey()).toBe(false);
    });

    it('should serialize configuration to JSON', () => {
      configManager.updateConfig({ 
        humorLevel: 'savage', 
        frequency: 75,
        apiKey: 'test-key'
      });

      const json = configManager.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.humorLevel).toBe('savage');
      expect(parsed.frequency).toBe(75);
      expect(parsed.apiKey).toBe('test-key');
    });

    it('should load configuration from JSON string', () => {
      const configJson = JSON.stringify({
        humorLevel: 'mild',
        frequency: 25,
        enabled: false
      });

      configManager.fromJSON(configJson);
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('mild');
      expect(config.frequency).toBe(25);
      expect(config.enabled).toBe(false);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        configManager.fromJSON('invalid json');
      }).toThrow('Failed to parse configuration JSON');
    });

    it('should throw error for invalid configuration in JSON', () => {
      const invalidConfigJson = JSON.stringify({
        frequency: -1
      });

      expect(() => {
        configManager.fromJSON(invalidConfigJson);
      }).toThrow('Invalid configuration in JSON');
    });
  });

  describe('Configuration Priority', () => {
    it('should prioritize initial config over environment and files', () => {
      // Set environment variable
      process.env.CONSOLE_ROAST_HUMOR_LEVEL = 'mild';
      
      // Mock config file
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        humorLevel: 'medium'
      }));

      // Initial config should override both
      configManager = new ConfigurationManager({ humorLevel: 'savage' });
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('savage');
    });

    it('should prioritize config file over environment variables', () => {
      // Set environment variable
      process.env.CONSOLE_ROAST_HUMOR_LEVEL = 'mild';
      
      // Mock config file with different value
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        humorLevel: 'savage'
      }));

      configManager = new ConfigurationManager();
      const config = configManager.getConfig();

      expect(config.humorLevel).toBe('savage');
    });
  });
});