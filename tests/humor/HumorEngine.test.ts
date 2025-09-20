import { HumorEngine } from '../../src/humor/HumorEngine';
import { ContentAnalyzer } from '../../src/content/ContentAnalyzer';
import { HumorDatabase } from '../../src/humor/HumorDatabase';
import { AnthropicClient } from '../../src/anthropic/AnthropicClient';
import { CacheManager } from '../../src/cache/CacheManager';
import {
  ConsoleRoastConfig,
  ContentAnalysis,
  ApiResponse,
  HumorResponse,
} from '../../types';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('HumorEngine', () => {
  let humorEngine: HumorEngine;
  let contentAnalyzer: ContentAnalyzer;
  let humorDatabase: HumorDatabase;
  let anthropicClient: AnthropicClient;
  let cacheManager: CacheManager;
  let config: ConsoleRoastConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      humorLevel: 'medium',
      frequency: 100,
      enabled: true,
      cacheSize: 50,
      apiTimeout: 5000,
      fallbackToLocal: true,
    };

    contentAnalyzer = new ContentAnalyzer();
    humorDatabase = new HumorDatabase();
    anthropicClient = new AnthropicClient(config);
    cacheManager = new CacheManager(config.cacheSize);

    humorEngine = new HumorEngine(
      contentAnalyzer,
      humorDatabase,
      anthropicClient,
      cacheManager,
      config
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateHumor', () => {
    it('should return cached response when available', async () => {
      const content = ['Hello world'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'Hello world',
      };

      const cachedResponse: HumorResponse = {
        text: 'Cached humor response',
        confidence: 0.9,
        source: 'api',
        cached: false,
      };

      // Pre-populate cache
      const cacheKey = cacheManager.generateKey('Hello world|string|simple|false|neutral||medium');
      cacheManager.set(cacheKey, cachedResponse);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.text).toBe('Cached humor response');
      expect(result.cached).toBe(true);
      expect(result.source).toBe('api');
    });

    it('should use API when available and cache is empty', async () => {
      const content = ['Error occurred'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: true,
        sentiment: 'negative',
        patterns: ['error'],
        sanitizedContent: 'Error occurred',
      };

      // Mock successful API response
      const mockApiResponse: ApiResponse = {
        success: true,
        humor: 'API generated humor',
        responseTime: 100,
      };

      jest.spyOn(anthropicClient, 'generateHumor').mockResolvedValue(mockApiResponse);
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.text).toBe('API generated humor');
      expect(result.source).toBe('api');
      expect(result.cached).toBe(false);
      expect(result.confidence).toBe(0.9);
    });

    it('should fallback to local humor when API fails', async () => {
      const content = ['Success message'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'positive',
        patterns: ['success'],
        sanitizedContent: 'Success message',
      };

      // Mock API failure
      const mockApiResponse: ApiResponse = {
        success: false,
        error: 'API error',
        responseTime: 100,
      };

      jest.spyOn(anthropicClient, 'generateHumor').mockResolvedValue(mockApiResponse);
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.cached).toBe(false);
      expect(result.confidence).toBe(0.7);
      expect(result.text).toBeTruthy();
    });

    it('should use local humor when API is not available', async () => {
      const content = ['Debug info'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: ['debug'],
        sanitizedContent: 'Debug info',
      };

      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.cached).toBe(false);
      expect(result.confidence).toBe(0.7);
      expect(result.text).toBeTruthy();
    });

    it('should cache responses from both API and local sources', async () => {
      const content = ['Test message'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'Test message',
      };

      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      const result = await humorEngine.generateHumor(content, analysis);

      // Verify response was cached
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.size).toBe(1);

      // Second call should return cached result
      const cachedResult = await humorEngine.generateHumor(content, analysis);
      expect(cachedResult.cached).toBe(true);
      expect(cachedResult.text).toBe(result.text);
    });
  });

  describe('selectHumorType', () => {
    it('should select error type for error content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: true,
        sentiment: 'negative',
        patterns: ['error'],
        sanitizedContent: 'Error message',
      };

      const type = humorEngine.selectHumorType(analysis);
      expect(type).toBe('error');
    });

    it('should select success type for positive sentiment', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'positive',
        patterns: ['success'],
        sanitizedContent: 'Success message',
      };

      const type = humorEngine.selectHumorType(analysis);
      expect(type).toBe('success');
    });

    it('should select data type for data-heavy content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['object', 'array'],
        complexity: 'medium',
        isError: false,
        sentiment: 'neutral',
        patterns: ['json', 'array'],
        sanitizedContent: '{"key": "value"}',
      };

      const type = humorEngine.selectHumorType(analysis);
      expect(type).toBe('data');
    });

    it('should select general type for neutral content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'Regular message',
      };

      const type = humorEngine.selectHumorType(analysis);
      expect(type).toBe('general');
    });
  });

  describe('formatResponse', () => {
    it('should format mild humor with appropriate emoji', () => {
      config.humorLevel = 'mild';
      humorEngine.updateConfig(config);

      const result = humorEngine.formatResponse('Gentle humor', 'Original message');
      expect(result).toBe('Original message 💭 Gentle humor');
    });

    it('should format medium humor with appropriate emoji', () => {
      config.humorLevel = 'medium';
      humorEngine.updateConfig(config);

      const result = humorEngine.formatResponse('Witty humor', 'Original message');
      expect(result).toBe('Original message 🤔 Witty humor');
    });

    it('should format savage humor with appropriate emoji', () => {
      config.humorLevel = 'savage';
      humorEngine.updateConfig(config);

      const result = humorEngine.formatResponse('Savage humor', 'Original message');
      expect(result).toBe('Original message 🔥 Savage humor');
    });
  });

  describe('updateConfig', () => {
    it('should update internal configuration', () => {
      const newConfig: ConsoleRoastConfig = {
        ...config,
        humorLevel: 'savage',
        cacheSize: 100,
      };

      humorEngine.updateConfig(newConfig);

      // Verify config was updated by checking format response
      const result = humorEngine.formatResponse('Test humor', 'Test message');
      expect(result).toBe('Test message 🔥 Test humor');
    });

    it('should propagate config to dependencies', () => {
      const newConfig: ConsoleRoastConfig = {
        ...config,
        apiKey: 'new-api-key',
        cacheSize: 200,
      };

      const updateConfigSpy = jest.spyOn(anthropicClient, 'updateConfig');
      const setMaxSizeSpy = jest.spyOn(cacheManager, 'setMaxSize');

      humorEngine.updateConfig(newConfig);

      expect(updateConfigSpy).toHaveBeenCalledWith(newConfig);
      expect(setMaxSizeSpy).toHaveBeenCalledWith(200);
    });
  });

  describe('getMetrics', () => {
    it('should return cache and API metrics', () => {
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);
      jest.spyOn(anthropicClient, 'getRateLimitStatus').mockReturnValue({
        remaining: 95,
        resetTime: new Date(),
      });

      const metrics = humorEngine.getMetrics();

      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('apiStatus');
      expect(metrics.cacheStats).toHaveProperty('size');
      expect(metrics.cacheStats).toHaveProperty('hitRate');
      expect(metrics.apiStatus).toHaveProperty('available');
      expect(metrics.apiStatus).toHaveProperty('rateLimitRemaining');
      expect(metrics.apiStatus.available).toBe(true);
      expect(metrics.apiStatus.rateLimitRemaining).toBe(95);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached responses', async () => {
      const content = ['Test'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'Test',
      };

      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      // Generate humor to populate cache
      await humorEngine.generateHumor(content, analysis);
      expect(cacheManager.getStats().size).toBe(1);

      // Clear cache
      humorEngine.clearCache();
      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete humor generation flow with API success', async () => {
      const content = ['Processing user data', { id: 123, name: 'John' }];
      const analysis = contentAnalyzer.analyze(content);

      const mockApiResponse: ApiResponse = {
        success: true,
        humor: 'Your data is more organized than my life!',
        responseTime: 150,
      };

      jest.spyOn(anthropicClient, 'generateHumor').mockResolvedValue(mockApiResponse);
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.text).toBe('Your data is more organized than my life!');
      expect(result.source).toBe('api');
      expect(result.cached).toBe(false);

      // Verify caching worked
      const cachedResult = await humorEngine.generateHumor(content, analysis);
      expect(cachedResult.cached).toBe(true);
    });

    it('should handle complete humor generation flow with API failure and local fallback', async () => {
      const content = ['Error: Connection failed'];
      const analysis = contentAnalyzer.analyze(content);

      const mockApiResponse: ApiResponse = {
        success: false,
        error: 'Rate limit exceeded',
        responseTime: 100,
      };

      jest.spyOn(anthropicClient, 'generateHumor').mockResolvedValue(mockApiResponse);
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.cached).toBe(false);
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should handle API timeout and fallback gracefully', async () => {
      const content = ['Timeout test'];
      const analysis = contentAnalyzer.analyze(content);

      jest.spyOn(anthropicClient, 'generateHumor').mockRejectedValue(new Error('Request timeout'));
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(true);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.text).toBeTruthy();
    });

    it('should provide ultimate fallback when all humor sources fail', async () => {
      const content = ['Ultimate fallback test'];
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'Ultimate fallback test',
      };

      // Mock empty humor database
      jest.spyOn(humorDatabase, 'getHumor').mockReturnValue([]);
      jest.spyOn(humorDatabase, 'getRandomHumor').mockReturnValue(null);
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
      // Should be one of the ultimate fallback messages (more flexible pattern)
      expect(result.text).toMatch(/console|logging|debug|noted|digital|diary|coffee|chat/i);
    });
  });

  describe('error handling', () => {
    it('should handle malformed content gracefully', async () => {
      const content = [null, undefined, { circular: {} }];
      // Create circular reference
      (content[2] as any).circular.self = content[2];

      const analysis = contentAnalyzer.analyze(content);

      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.text).toBeTruthy();
    });

    it('should handle cache errors gracefully', async () => {
      const content = ['Cache error test'];
      const analysis = contentAnalyzer.analyze(content);

      // Mock cache error
      jest.spyOn(cacheManager, 'get').mockImplementation(() => {
        throw new Error('Cache error');
      });
      jest.spyOn(anthropicClient, 'isAvailable').mockReturnValue(false);

      // Should not throw and should still return humor
      const result = await humorEngine.generateHumor(content, analysis);

      expect(result.source).toBe('local');
      expect(result.text).toBeTruthy();
    });
  });
});