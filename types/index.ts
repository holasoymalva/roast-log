/**
 * Core configuration interface for roast-log
 */
export interface ConsoleRoastConfig {
  /** Anthropic API key for dynamic humor generation */
  apiKey?: string;
  /** Humor intensity level */
  humorLevel: 'mild' | 'medium' | 'savage';
  /** Percentage of logs to enhance (0-100) */
  frequency: number;
  /** Whether the library is enabled */
  enabled: boolean;
  /** Maximum number of cached responses */
  cacheSize: number;
  /** API request timeout in milliseconds */
  apiTimeout: number;
  /** Whether to fallback to local humor when API fails */
  fallbackToLocal: boolean;
}

/**
 * Content analysis result interface
 */
export interface ContentAnalysis {
  /** Detected data types in the logged content */
  dataTypes: string[];
  /** Content complexity assessment */
  complexity: 'simple' | 'medium' | 'complex';
  /** Whether the content appears to be an error */
  isError: boolean;
  /** Sentiment analysis of the content */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** Detected patterns in the content */
  patterns: string[];
  /** Content with sensitive information removed */
  sanitizedContent: string;
}

/**
 * Log entry interface for tracking console.log calls
 */
export interface LogEntry {
  /** When the log was created */
  timestamp: Date;
  /** Original arguments passed to console.log */
  originalArgs: any[];
  /** Processed content string */
  processedContent: string;
  /** Analysis of the logged content */
  contentAnalysis: ContentAnalysis;
  /** Generated humorous response (if any) */
  humorResponse?: string;
  /** Source of the humor response */
  source: 'api' | 'local' | 'cache';
}

/**
 * Humor response interface
 */
export interface HumorResponse {
  /** The humorous text to display */
  text: string;
  /** Confidence level of the response (0-1) */
  confidence: number;
  /** Source of the humor */
  source: 'api' | 'local';
  /** Whether this response was retrieved from cache */
  cached: boolean;
}

/**
 * Humor database entry interface
 */
export interface HumorEntry {
  /** Content patterns that trigger this humor */
  triggers: string[];
  /** Array of possible humorous responses */
  responses: string[];
  /** Humor intensity level */
  humorLevel: 'mild' | 'medium' | 'savage';
  /** Category of humor */
  category: 'error' | 'success' | 'data' | 'general';
}

/**
 * Cache entry interface
 */
export interface CacheEntry {
  /** The cached humor response */
  response: HumorResponse;
  /** When this entry was created */
  timestamp: Date;
  /** How many times this entry has been accessed */
  accessCount: number;
}

/**
 * API client response interface
 */
export interface ApiResponse {
  /** Whether the API call was successful */
  success: boolean;
  /** The humor text (if successful) */
  humor?: string;
  /** Error message (if failed) */
  error?: string;
  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  /** Total number of logs processed */
  totalLogs: number;
  /** Number of API calls made */
  apiCalls: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Current memory usage in bytes */
  memoryUsage: number;
}

/**
 * Logger interceptor interface
 */
export interface ILoggerInterceptor {
  /** Intercept console.log calls */
  intercept(): void;
  /** Restore original console.log */
  restore(): void;
  /** Enhanced logging method */
  enhancedLog(message: any, ...args: any[]): void;
}

/**
 * Configuration manager interface
 */
export interface IConfigurationManager {
  /** Get current configuration */
  getConfig(): ConsoleRoastConfig;
  /** Update configuration */
  updateConfig(config: Partial<ConsoleRoastConfig>): void;
  /** Validate configuration */
  validateConfig(config: Partial<ConsoleRoastConfig>): boolean;
}

/**
 * Content analyzer interface
 */
export interface IContentAnalyzer {
  /** Analyze logged content */
  analyze(content: any[]): ContentAnalysis;
  /** Sanitize content by removing sensitive information */
  sanitize(content: string): string;
}

/**
 * Humor engine interface
 */
export interface IHumorEngine {
  /** Generate humor for given content */
  generateHumor(content: any[], analysis: ContentAnalysis): Promise<HumorResponse>;
  /** Select appropriate humor type */
  selectHumorType(analysis: ContentAnalysis): string;
  /** Format response combining original message with humor */
  formatResponse(humor: string, original: string): string;
}

/**
 * Cache manager interface
 */
export interface ICacheManager {
  /** Get cached response */
  get(key: string): CacheEntry | null;
  /** Store response in cache */
  set(key: string, response: HumorResponse): void;
  /** Generate cache key from content */
  generateKey(content: string): string;
  /** Clear cache */
  clear(): void;
  /** Get cache statistics */
  getStats(): { size: number; hitRate: number };
}

/**
 * Anthropic API client interface
 */
export interface IAnthropicClient {
  /** Generate humor using Anthropic API */
  generateHumor(content: string, context: ContentAnalysis): Promise<ApiResponse>;
  /** Check if API is available */
  isAvailable(): boolean;
  /** Get current rate limit status */
  getRateLimitStatus(): { remaining: number; resetTime: Date };
}

/**
 * Local humor database interface
 */
export interface IHumorDatabase {
  /** Get humor entries matching the analysis */
  getHumor(analysis: ContentAnalysis, humorLevel: string): HumorEntry[];
  /** Add new humor entry */
  addHumor(entry: HumorEntry): void;
  /** Get random humor from category */
  getRandomHumor(category: string, humorLevel: string): string | null;
}