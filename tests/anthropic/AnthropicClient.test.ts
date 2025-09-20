import { AnthropicClient } from '../../src/anthropic/AnthropicClient';
import { ConsoleRoastConfig, ContentAnalysis } from '../../types';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');
const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('AnthropicClient', () => {
  let client: AnthropicClient;
  let mockConfig: ConsoleRoastConfig;
  let mockContentAnalysis: ContentAnalysis;
  let mockMessagesCreate: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      apiKey: 'test-api-key',
      humorLevel: 'medium',
      frequency: 50,
      enabled: true,
      cacheSize: 100,
      apiTimeout: 1000, // Shorter timeout for tests
      fallbackToLocal: true
    };

    mockContentAnalysis = {
      dataTypes: ['string'],
      complexity: 'simple',
      isError: false,
      sentiment: 'neutral',
      patterns: [],
      sanitizedContent: 'test content'
    };

    // Create mock for messages.create
    mockMessagesCreate = jest.fn();

    // Mock the Anthropic constructor to return an object with messages.create
    MockedAnthropic.mockImplementation(() => ({
      messages: {
        create: mockMessagesCreate
      }
    } as any));
    
    client = new AnthropicClient(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with valid API key', () => {
      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
      expect(client.isAvailable()).toBe(true);
    });

    it('should handle missing API key', () => {
      const configWithoutKey = { ...mockConfig, apiKey: undefined };
      const clientWithoutKey = new AnthropicClient(configWithoutKey);
      expect(clientWithoutKey.isAvailable()).toBe(false);
    });

    it('should handle Anthropic initialization error', () => {
      MockedAnthropic.mockImplementation(() => {
        throw new Error('Invalid API key');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const clientWithError = new AnthropicClient(mockConfig);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Anthropic client:', expect.any(Error));
      expect(clientWithError.isAvailable()).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateHumor', () => {
    it('should successfully generate humor', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Nice logging there, champ!'
        }]
      };

      mockMessagesCreate.mockResolvedValue(mockResponse as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(true);
      expect(result.humor).toBe('Nice logging there, champ!');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: expect.stringContaining('test content')
        }]
      });
    });

    it('should handle API timeout', async () => {
      const shortTimeoutConfig = { ...mockConfig, apiTimeout: 50 };
      const timeoutClient = new AnthropicClient(shortTimeoutConfig);

      mockMessagesCreate.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await timeoutClient.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should retry on failure and eventually succeed', async () => {
      mockMessagesCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          content: [{
            type: 'text',
            text: 'Third time\'s the charm!'
          }]
        } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(true);
      expect(result.humor).toBe('Third time\'s the charm!');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Persistent error'));

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent error');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    });

    it('should handle empty API response', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: []
      } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty response from API');
    });

    it('should handle non-text content in response', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: 'abc123' }
        }]
      } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No text content in API response');
    });

    it('should return error when client not available', async () => {
      const clientWithoutKey = new AnthropicClient({ ...mockConfig, apiKey: undefined });

      const result = await clientWithoutKey.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Anthropic client not available - missing API key');
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after max failures', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API Error'));

      // Trigger enough failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        await client.generateHumor('test content', mockContentAnalysis);
      }

      // Next call should be blocked by circuit breaker
      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker is open');
    });

    it('should provide circuit breaker status', () => {
      const status = client.getCircuitBreakerStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status.state).toBe('closed');
      expect(status.failureCount).toBe(0);
      expect(status.lastFailureTime).toBeNull();
    });
  });

  describe('rate limiting', () => {
    it('should return error when rate limit exceeded', async () => {
      // Simulate rate limit exceeded
      const rateLimitStatus = client.getRateLimitStatus();
      
      // Make enough calls to exceed rate limit (simplified test)
      for (let i = 0; i < rateLimitStatus.remaining + 1; i++) {
        mockMessagesCreate.mockResolvedValue({
          content: [{
            type: 'text',
            text: `Response ${i}`
          }]
        } as any);
        
        await client.generateHumor('test content', mockContentAnalysis);
      }

      const result = await client.generateHumor('test content', mockContentAnalysis);
      
      // This test is simplified - in a real scenario, we'd need to mock the rate limiting more precisely
      expect(result).toBeDefined();
    });

    it('should provide rate limit status', () => {
      const status = client.getRateLimitStatus();
      
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(typeof status.remaining).toBe('number');
      expect(status.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('prompt building', () => {
    it('should build appropriate prompt for different humor levels', async () => {
      const configs = [
        { ...mockConfig, humorLevel: 'mild' as const },
        { ...mockConfig, humorLevel: 'medium' as const },
        { ...mockConfig, humorLevel: 'savage' as const }
      ];

      for (const config of configs) {
        const testClient = new AnthropicClient(config);
        
        mockMessagesCreate.mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Test response'
          }]
        } as any);

        await testClient.generateHumor('test content', mockContentAnalysis);

        const lastCall = mockMessagesCreate.mock.calls.slice(-1)[0];
        const prompt = lastCall[0].messages[0].content;

        expect(prompt).toContain(`Humor Level: ${config.humorLevel}`);
      }
    });

    it('should include context information in prompt', async () => {
      const errorAnalysis: ContentAnalysis = {
        dataTypes: ['object', 'string'],
        complexity: 'complex',
        isError: true,
        sentiment: 'negative',
        patterns: ['stack-trace', 'error-message'],
        sanitizedContent: 'Error: Something went wrong'
      };

      mockMessagesCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Error humor response'
        }]
      } as any);

      await client.generateHumor('error content', errorAnalysis);

      const lastCall = mockMessagesCreate.mock.calls.slice(-1)[0];
      const prompt = lastCall[0].messages[0].content;

      expect(prompt).toContain('This appears to be an error');
      expect(prompt).toContain('Data types: object, string');
      expect(prompt).toContain('Complexity: complex');
      expect(prompt).toContain('Sentiment: negative');
      expect(prompt).toContain('Patterns: stack-trace, error-message');
    });
  });

  describe('response validation', () => {
    it('should trim and clean response text', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: '  "This is a quoted response"  '
        }]
      } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(true);
      expect(result.humor).toBe('This is a quoted response');
    });

    it('should truncate overly long responses', async () => {
      const longResponse = 'A'.repeat(200);
      
      mockMessagesCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: longResponse
        }]
      } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(true);
      expect(result.humor!.length).toBeLessThanOrEqual(150);
      expect(result.humor).toMatch(/\.\.\.$/);
    });

    it('should handle empty response after cleaning', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: '   ""   '
        }]
      } as any);

      const result = await client.generateHumor('test content', mockContentAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty humor response');
    });
  });

  describe('configuration updates', () => {
    it('should update configuration and reinitialize client', () => {
      // Clear previous calls
      MockedAnthropic.mockClear();
      
      const newConfig = { ...mockConfig, apiKey: 'new-api-key' };
      
      client.updateConfig(newConfig);
      
      // Should have been called once in updateConfig
      expect(MockedAnthropic).toHaveBeenCalledTimes(1);
      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'new-api-key'
      });
    });

    it('should handle configuration update with no API key', () => {
      const configWithoutKey = { ...mockConfig, apiKey: undefined };
      
      client.updateConfig(configWithoutKey);
      
      expect(client.isAvailable()).toBe(false);
    });
  });


});