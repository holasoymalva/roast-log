import { LoggerInterceptor } from '../../src/logger/LoggerInterceptor';
import {
  IHumorEngine,
  IConfigurationManager,
  IContentAnalyzer,
  ConsoleRoastConfig,
  ContentAnalysis,
  HumorResponse,
} from '../../types';

// Mock implementations
class MockHumorEngine implements IHumorEngine {
  async generateHumor(content: any[], analysis: ContentAnalysis): Promise<HumorResponse> {
    return {
      text: 'Mock humor response',
      confidence: 0.8,
      source: 'local',
      cached: false,
    };
  }

  selectHumorType(analysis: ContentAnalysis): string {
    return 'general';
  }

  formatResponse(humor: string, original: string): string {
    return `${original} • ${humor}`;
  }

  updateConfig(config: ConsoleRoastConfig): void {
    // Mock implementation
  }

  getMetrics(): {
    cacheStats: { size: number; hitRate: number };
    apiStatus: { available: boolean; rateLimitRemaining: number };
  } {
    return {
      cacheStats: { size: 0, hitRate: 0 },
      apiStatus: { available: false, rateLimitRemaining: 0 }
    };
  }

  clearCache(): void {
    // Mock implementation
  }
}

class MockConfigurationManager implements IConfigurationManager {
  private config: ConsoleRoastConfig = {
    humorLevel: 'medium',
    frequency: 50,
    enabled: true,
    cacheSize: 100,
    apiTimeout: 5000,
    fallbackToLocal: true,
  };

  getConfig(): ConsoleRoastConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ConsoleRoastConfig>): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(config: Partial<ConsoleRoastConfig>): boolean {
    return true;
  }

  hasApiKey(): boolean {
    return !!this.config.apiKey;
  }
}

class MockContentAnalyzer implements IContentAnalyzer {
  analyze(content: any[]): ContentAnalysis {
    return {
      dataTypes: ['string'],
      complexity: 'simple',
      isError: false,
      sentiment: 'neutral',
      patterns: [],
      sanitizedContent: content.join(' '),
    };
  }

  sanitize(content: string): string {
    return content;
  }
}

describe('LoggerInterceptor', () => {
  let loggerInterceptor: LoggerInterceptor;
  let mockHumorEngine: MockHumorEngine;
  let mockConfigManager: MockConfigurationManager;
  let mockContentAnalyzer: MockContentAnalyzer;
  let originalConsoleLog: typeof console.log;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Store original console.log
    originalConsoleLog = console.log;
    
    // Create spy for console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create mock dependencies
    mockHumorEngine = new MockHumorEngine();
    mockConfigManager = new MockConfigurationManager();
    mockContentAnalyzer = new MockContentAnalyzer();

    // Create logger interceptor
    loggerInterceptor = new LoggerInterceptor(
      mockHumorEngine,
      mockConfigManager,
      mockContentAnalyzer
    );
  });

  afterEach(() => {
    // Restore original console.log
    loggerInterceptor.restore();
    console.log = originalConsoleLog;
    consoleLogSpy.mockRestore();
  });

  describe('intercept()', () => {
    it('should intercept console.log calls', () => {
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(false);
      
      loggerInterceptor.intercept();
      
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(true);
    });

    it('should not intercept multiple times', () => {
      loggerInterceptor.intercept();
      const firstInterceptedState = loggerInterceptor.isCurrentlyIntercepted();
      
      loggerInterceptor.intercept(); // Second call
      
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(firstInterceptedState);
    });

    it('should replace console.log with enhanced version', () => {
      const originalLog = console.log;
      
      loggerInterceptor.intercept();
      
      expect(console.log).not.toBe(originalLog);
    });
  });

  describe('restore()', () => {
    it('should restore original console.log', () => {
      const originalLog = console.log;
      
      loggerInterceptor.intercept();
      loggerInterceptor.restore();
      
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(false);
    });

    it('should not restore if not intercepted', () => {
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(false);
      
      loggerInterceptor.restore();
      
      expect(loggerInterceptor.isCurrentlyIntercepted()).toBe(false);
    });
  });

  describe('enhancedLog()', () => {
    beforeEach(() => {
      loggerInterceptor.intercept();
    });

    it('should handle single argument', () => {
      loggerInterceptor.enhancedLog('test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should handle multiple arguments', () => {
      loggerInterceptor.enhancedLog('test', 'message', 123);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test', 'message', 123);
    });

    it('should use original console.log when disabled', () => {
      mockConfigManager.updateConfig({ enabled: false });
      
      loggerInterceptor.enhancedLog('test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should respect frequency settings', () => {
      // Set frequency to 0 (never apply humor)
      mockConfigManager.updateConfig({ frequency: 0 });
      
      loggerInterceptor.enhancedLog('test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only original log, no humor
    });

    it('should apply humor when frequency is 100', async () => {
      mockConfigManager.updateConfig({ frequency: 100 });
      
      loggerInterceptor.enhancedLog('test message');
      
      // Wait for async humor processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // Original log + humor
    });

    it('should handle different data types', () => {
      const testCases = [
        'string',
        123,
        { key: 'value' },
        [1, 2, 3],
        true,
        null,
        undefined,
      ];

      testCases.forEach(testCase => {
        loggerInterceptor.enhancedLog(testCase);
        expect(consoleLogSpy).toHaveBeenCalledWith(testCase);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock humor engine to throw error
      jest.spyOn(mockHumorEngine, 'generateHumor').mockRejectedValue(new Error('Test error'));
      
      loggerInterceptor.enhancedLog('test message');
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should still log the original message
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });
  });

  describe('frequency-based humor application', () => {
    beforeEach(() => {
      loggerInterceptor.intercept();
      loggerInterceptor.resetStats();
    });

    it('should apply humor based on frequency percentage', async () => {
      mockConfigManager.updateConfig({ frequency: 50 });
      
      // Log 10 times and count humor applications
      const promises = [];
      for (let i = 0; i < 10; i++) {
        loggerInterceptor.enhancedLog(`message ${i}`);
        promises.push(new Promise(resolve => setTimeout(resolve, 5)));
      }
      
      await Promise.all(promises);
      
      // With frequency 50, we should have some humor but not all
      const totalCalls = consoleLogSpy.mock.calls.length;
      expect(totalCalls).toBeGreaterThan(10); // More than just original logs
      expect(totalCalls).toBeLessThanOrEqual(20); // But not more than double (which would be 100% frequency)
    });

    it('should be deterministic based on log count', () => {
      mockConfigManager.updateConfig({ frequency: 25 });
      
      // Reset and log the same sequence twice
      loggerInterceptor.resetStats();
      const firstSequence = [];
      for (let i = 0; i < 8; i++) {
        loggerInterceptor.enhancedLog(`message ${i}`);
        firstSequence.push(consoleLogSpy.mock.calls.length);
      }
      
      consoleLogSpy.mockClear();
      loggerInterceptor.resetStats();
      const secondSequence = [];
      for (let i = 0; i < 8; i++) {
        loggerInterceptor.enhancedLog(`message ${i}`);
        secondSequence.push(consoleLogSpy.mock.calls.length);
      }
      
      // The pattern should be the same
      expect(firstSequence).toEqual(secondSequence);
    });
  });

  describe('humor formatting', () => {
    beforeEach(() => {
      loggerInterceptor.intercept();
      mockConfigManager.updateConfig({ frequency: 100 }); // Always apply humor
    });

    it('should format humor with mild level prefix', async () => {
      mockConfigManager.updateConfig({ humorLevel: 'mild' });
      
      loggerInterceptor.enhancedLog('test message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const humorCall = consoleLogSpy.mock.calls.find(call => 
        call[0].includes('💭')
      );
      expect(humorCall).toBeDefined();
    });

    it('should format humor with medium level prefix', async () => {
      mockConfigManager.updateConfig({ humorLevel: 'medium' });
      
      loggerInterceptor.enhancedLog('test message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const humorCall = consoleLogSpy.mock.calls.find(call => 
        call[0].includes('🤔')
      );
      expect(humorCall).toBeDefined();
    });

    it('should format humor with savage level prefix', async () => {
      mockConfigManager.updateConfig({ humorLevel: 'savage' });
      
      loggerInterceptor.enhancedLog('test message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const humorCall = consoleLogSpy.mock.calls.find(call => 
        call[0].includes('🔥')
      );
      expect(humorCall).toBeDefined();
    });
  });

  describe('statistics and utilities', () => {
    it('should track log count', () => {
      loggerInterceptor.intercept();
      
      loggerInterceptor.enhancedLog('message 1');
      loggerInterceptor.enhancedLog('message 2');
      loggerInterceptor.enhancedLog('message 3');
      
      const stats = loggerInterceptor.getStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.isIntercepted).toBe(true);
    });

    it('should reset statistics', () => {
      loggerInterceptor.intercept();
      
      loggerInterceptor.enhancedLog('message 1');
      loggerInterceptor.enhancedLog('message 2');
      
      expect(loggerInterceptor.getStats().totalLogs).toBe(2);
      
      loggerInterceptor.resetStats();
      
      expect(loggerInterceptor.getStats().totalLogs).toBe(0);
    });

    it('should update dependencies', () => {
      const newHumorEngine = new MockHumorEngine();
      const newConfigManager = new MockConfigurationManager();
      const newContentAnalyzer = new MockContentAnalyzer();
      
      loggerInterceptor.updateDependencies(
        newHumorEngine,
        newConfigManager,
        newContentAnalyzer
      );
      
      // Dependencies should be updated (we can't directly test this, but no errors should occur)
      expect(() => loggerInterceptor.enhancedLog('test')).not.toThrow();
    });
  });

  describe('integration with console.log', () => {
    it('should maintain backward compatibility', () => {
      loggerInterceptor.intercept();
      
      // These should all work without throwing errors
      console.log('simple string');
      console.log('multiple', 'arguments', 123);
      console.log({ object: 'value' });
      console.log(['array', 'values']);
      console.log(null);
      console.log(undefined);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(6);
    });

    it('should handle console.log with no arguments', () => {
      loggerInterceptor.intercept();
      
      console.log();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(undefined);
    });

    it('should preserve original console.log behavior after restore', () => {
      loggerInterceptor.intercept();
      loggerInterceptor.restore();
      
      console.log('test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // No humor should be added
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      loggerInterceptor.intercept();
    });

    it('should handle content analyzer errors gracefully', async () => {
      jest.spyOn(mockContentAnalyzer, 'analyze').mockImplementation(() => {
        throw new Error('Analysis failed');
      });
      
      loggerInterceptor.enhancedLog('test message');
      
      // Should still log the original message
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should handle humor engine errors gracefully', async () => {
      jest.spyOn(mockHumorEngine, 'generateHumor').mockRejectedValue(new Error('Humor failed'));
      mockConfigManager.updateConfig({ frequency: 100 });
      
      loggerInterceptor.enhancedLog('test message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should still log the original message
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should handle configuration manager errors gracefully', () => {
      jest.spyOn(mockConfigManager, 'getConfig').mockImplementation(() => {
        throw new Error('Config failed');
      });
      
      loggerInterceptor.enhancedLog('test message');
      
      // Should still log the original message
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });
  });
});