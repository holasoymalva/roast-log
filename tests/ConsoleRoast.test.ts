import ConsoleRoast from '../src/index';
import { ConsoleRoastConfig } from '../types';

describe('ConsoleRoast Integration Tests', () => {
  let consoleRoast: ConsoleRoast;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    // Store original console.log
    originalConsoleLog = console.log;
    
    // Create fresh instance for each test
    consoleRoast = new ConsoleRoast({
      enabled: false, // Start disabled for controlled testing
      humorLevel: 'mild',
      frequency: 100, // Always apply humor for testing
      cacheSize: 10,
      apiTimeout: 1000,
      fallbackToLocal: true
    });
  });

  afterEach(() => {
    // Cleanup after each test
    if (consoleRoast) {
      consoleRoast.cleanup();
    }
    
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultRoast = new ConsoleRoast();
      const config = defaultRoast.getConfig();
      
      expect(config.humorLevel).toBe('medium');
      expect(config.frequency).toBe(50);
      expect(config.enabled).toBe(true);
      expect(config.cacheSize).toBe(100);
      expect(config.fallbackToLocal).toBe(true);
      
      defaultRoast.cleanup();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<ConsoleRoastConfig> = {
        humorLevel: 'savage',
        frequency: 25,
        enabled: false,
        cacheSize: 50
      };
      
      const customRoast = new ConsoleRoast(customConfig);
      const config = customRoast.getConfig();
      
      expect(config.humorLevel).toBe('savage');
      expect(config.frequency).toBe(25);
      expect(config.enabled).toBe(false);
      expect(config.cacheSize).toBe(50);
      
      customRoast.cleanup();
    });

    it('should auto-enable if configuration specifies enabled: true', () => {
      const autoEnabledRoast = new ConsoleRoast({ enabled: true });
      
      expect(autoEnabledRoast.isCurrentlyEnabled()).toBe(true);
      
      autoEnabledRoast.cleanup();
    });
  });

  describe('Enable/Disable Functionality', () => {
    it('should enable and disable console.log interception', () => {
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
      
      consoleRoast.enable();
      expect(consoleRoast.isCurrentlyEnabled()).toBe(true);
      
      consoleRoast.disable();
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
    });

    it('should handle multiple enable calls gracefully', () => {
      consoleRoast.enable();
      consoleRoast.enable();
      consoleRoast.enable();
      
      expect(consoleRoast.isCurrentlyEnabled()).toBe(true);
    });

    it('should handle multiple disable calls gracefully', () => {
      consoleRoast.enable();
      consoleRoast.disable();
      consoleRoast.disable();
      consoleRoast.disable();
      
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
    });

    it('should restore original console.log when disabled', () => {
      const testMessage = 'test message';
      const mockLog = jest.fn();
      console.log = mockLog;
      
      consoleRoast.enable();
      console.log(testMessage);
      
      // Should have been intercepted (mockLog might not be called directly)
      consoleRoast.disable();
      
      // Now should use our mock directly
      console.log(testMessage);
      expect(mockLog).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration and propagate changes', () => {
      const newConfig: Partial<ConsoleRoastConfig> = {
        humorLevel: 'savage',
        frequency: 75,
        cacheSize: 200
      };
      
      consoleRoast.configure(newConfig);
      const updatedConfig = consoleRoast.getConfig();
      
      expect(updatedConfig.humorLevel).toBe('savage');
      expect(updatedConfig.frequency).toBe(75);
      expect(updatedConfig.cacheSize).toBe(200);
    });

    it('should enable/disable based on configuration changes', () => {
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
      
      consoleRoast.configure({ enabled: true });
      expect(consoleRoast.isCurrentlyEnabled()).toBe(true);
      
      consoleRoast.configure({ enabled: false });
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
    });

    it('should throw error when configuring uninitialized instance', () => {
      consoleRoast.cleanup(); // This sets isInitialized to false
      
      expect(() => {
        consoleRoast.configure({ humorLevel: 'mild' });
      }).toThrow('ConsoleRoast not properly initialized');
    });
  });

  describe('Console.log Enhancement', () => {
    it('should enhance console.log with humor when enabled', (done) => {
      const testMessage = 'Hello, world!';
      const logSpy = jest.spyOn(console, 'log');
      
      consoleRoast.enable();
      console.log(testMessage);
      
      // Give some time for async humor generation
      setTimeout(() => {
        expect(logSpy).toHaveBeenCalled();
        // The first call should be the original message
        expect(logSpy).toHaveBeenCalledWith(testMessage);
        
        logSpy.mockRestore();
        done();
      }, 100);
    });

    it('should handle multiple arguments correctly', (done) => {
      const logSpy = jest.spyOn(console, 'log');
      
      consoleRoast.enable();
      console.log('Message:', { key: 'value' }, 123, true);
      
      setTimeout(() => {
        expect(logSpy).toHaveBeenCalled();
        // Should handle all arguments
        expect(logSpy).toHaveBeenCalledWith('Message:', { key: 'value' }, 123, true);
        
        logSpy.mockRestore();
        done();
      }, 100);
    });

    it('should not enhance console.log when disabled', () => {
      const testMessage = 'Test message';
      const logSpy = jest.spyOn(console, 'log');
      
      // Ensure it's disabled
      consoleRoast.disable();
      console.log(testMessage);
      
      // Should only be called once (the original call)
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(testMessage);
      
      logSpy.mockRestore();
    });

    it('should respect frequency settings', (done) => {
      const logSpy = jest.spyOn(console, 'log');
      
      // Set frequency to 0 (never apply humor)
      consoleRoast.configure({ frequency: 0 });
      consoleRoast.enable();
      
      console.log('Test message');
      
      setTimeout(() => {
        // Should only see the original log, no humor
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('Test message');
        
        logSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track performance metrics', () => {
      const metrics = consoleRoast.getMetrics();
      
      expect(metrics).toHaveProperty('totalLogs');
      expect(metrics).toHaveProperty('apiCalls');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('memoryUsage');
      
      expect(typeof metrics.totalLogs).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    it('should provide detailed status information', () => {
      const status = consoleRoast.getStatus();
      
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('hasApiKey');
      expect(status).toHaveProperty('apiAvailable');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('totalLogs');
      
      expect(status.initialized).toBe(true);
      expect(status.enabled).toBe(false);
      expect(typeof status.cacheSize).toBe('number');
    });

    it('should reset statistics when requested', () => {
      consoleRoast.resetStats();
      const metrics = consoleRoast.getMetrics();
      
      expect(metrics.totalLogs).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when requested', () => {
      consoleRoast.clearCache();
      const status = consoleRoast.getStatus();
      
      expect(status.cacheSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during humor generation', (done) => {
      const logSpy = jest.spyOn(console, 'log');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      consoleRoast.enable();
      
      // Log something that might cause issues
      console.log('Test message');
      
      setTimeout(() => {
        // Should still log the original message even if humor fails
        expect(logSpy).toHaveBeenCalledWith('Test message');
        
        logSpy.mockRestore();
        warnSpy.mockRestore();
        done();
      }, 100);
    });

    it('should throw error when enabling uninitialized instance', () => {
      consoleRoast.cleanup(); // This sets isInitialized to false
      
      expect(() => {
        consoleRoast.enable();
      }).toThrow('ConsoleRoast not properly initialized');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      consoleRoast.enable();
      expect(consoleRoast.isCurrentlyEnabled()).toBe(true);
      
      consoleRoast.cleanup();
      
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
      const status = consoleRoast.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.cacheSize).toBe(0);
    });

    it('should handle cleanup when already disabled', () => {
      expect(consoleRoast.isCurrentlyEnabled()).toBe(false);
      
      // Should not throw error
      expect(() => {
        consoleRoast.cleanup();
      }).not.toThrow();
    });
  });

  describe('API Integration', () => {
    it('should work without API key (local humor only)', () => {
      const status = consoleRoast.getStatus();
      
      // Should work even without API key
      expect(status.initialized).toBe(true);
      expect(status.hasApiKey).toBe(false);
      expect(status.apiAvailable).toBe(false);
    });

    it('should detect API key when provided', () => {
      const apiRoast = new ConsoleRoast({
        apiKey: 'sk-ant-test-key-12345',
        enabled: false
      });
      
      const status = apiRoast.getStatus();
      expect(status.hasApiKey).toBe(true);
      
      apiRoast.cleanup();
    });
  });

  describe('Different Humor Levels', () => {
    it('should handle mild humor level', () => {
      consoleRoast.configure({ humorLevel: 'mild' });
      const config = consoleRoast.getConfig();
      
      expect(config.humorLevel).toBe('mild');
    });

    it('should handle medium humor level', () => {
      consoleRoast.configure({ humorLevel: 'medium' });
      const config = consoleRoast.getConfig();
      
      expect(config.humorLevel).toBe('medium');
    });

    it('should handle savage humor level', () => {
      consoleRoast.configure({ humorLevel: 'savage' });
      const config = consoleRoast.getConfig();
      
      expect(config.humorLevel).toBe('savage');
    });
  });

  describe('Memory Management', () => {
    it('should report memory usage', () => {
      const metrics = consoleRoast.getMetrics();
      
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    it('should handle cache size changes', () => {
      consoleRoast.configure({ cacheSize: 50 });
      const config = consoleRoast.getConfig();
      
      expect(config.cacheSize).toBe(50);
    });
  });
});