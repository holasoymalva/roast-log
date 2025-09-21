/**
 * roast-log - A Node.js library that enhances console.log with humorous comments
 * 
 * This is the main entry point for the library.
 */

// Export all types for consumers
export * from '../types';

// Export individual components for advanced usage
export { ConfigurationManager, EnvConfig } from './config';
export { AnthropicClient } from './anthropic';
export { ContentAnalyzer } from './content';
export { HumorEngine } from './humor';
export { HumorDatabase } from './humor';
export { CacheManager } from './cache';
export { LoggerInterceptor } from './logger';

import { 
  ConsoleRoastConfig, 
  PerformanceMetrics,
  IConfigurationManager,
  IContentAnalyzer,
  IHumorEngine,
  IHumorDatabase,
  ICacheManager,
  IAnthropicClient,
  ILoggerInterceptor
} from '../types';

import { ConfigurationManager } from './config';
import { ContentAnalyzer } from './content';
import { HumorEngine } from './humor';
import { HumorDatabase } from './humor';
import { CacheManager } from './cache';
import { AnthropicClient } from './anthropic';
import { LoggerInterceptor } from './logger';

/**
 * Main ConsoleRoast class that initializes all components and provides
 * a simple interface for enabling/disabling and configuring the library
 */
export class ConsoleRoast {
  private configManager: IConfigurationManager;
  private contentAnalyzer!: IContentAnalyzer;
  private humorDatabase!: IHumorDatabase;
  private cacheManager!: ICacheManager;
  private anthropicClient!: IAnthropicClient;
  private humorEngine!: IHumorEngine;
  private loggerInterceptor!: ILoggerInterceptor;
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;

  /**
   * Create a new ConsoleRoast instance
   * @param config Optional initial configuration
   */
  constructor(config?: Partial<ConsoleRoastConfig>) {
    // Initialize configuration manager first
    this.configManager = new ConfigurationManager(config);
    
    // Initialize all components
    this.initializeComponents();
    
    this.isInitialized = true;
    
    // Auto-enable if configuration says so
    const currentConfig = this.configManager.getConfig();
    if (currentConfig.enabled) {
      this.enable();
    }
  }

  /**
   * Enable console.log enhancement with humor
   */
  enable(): void {
    if (!this.isInitialized) {
      throw new Error('ConsoleRoast not properly initialized');
    }

    if (this.isEnabled) {
      return; // Already enabled
    }

    this.loggerInterceptor.intercept();
    this.isEnabled = true;
  }

  /**
   * Disable console.log enhancement and restore original behavior
   */
  disable(): void {
    if (!this.isEnabled) {
      return; // Already disabled
    }

    this.loggerInterceptor.restore();
    this.isEnabled = false;
  }

  /**
   * Update configuration and propagate changes to all components
   * @param config Partial configuration to merge with current settings
   */
  configure(config: Partial<ConsoleRoastConfig>): void {
    if (!this.isInitialized) {
      throw new Error('ConsoleRoast not properly initialized');
    }

    // Update configuration
    this.configManager.updateConfig(config);
    
    // Propagate configuration changes to components
    const newConfig = this.configManager.getConfig();
    this.humorEngine.updateConfig(newConfig);
    this.anthropicClient.updateConfig(newConfig);
    this.cacheManager.setMaxSize(newConfig.cacheSize);

    // Handle enable/disable based on new configuration
    if (newConfig.enabled && !this.isEnabled) {
      this.enable();
    } else if (!newConfig.enabled && this.isEnabled) {
      this.disable();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConsoleRoastConfig {
    return this.configManager.getConfig();
  }

  /**
   * Check if the library is currently enabled
   */
  isCurrentlyEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get performance metrics and statistics
   */
  getMetrics(): PerformanceMetrics {
    const loggerStats = this.loggerInterceptor.getStats();
    const humorMetrics = this.humorEngine.getMetrics();
    const cacheStats = this.cacheManager.getStats();

    return {
      totalLogs: loggerStats.totalLogs,
      apiCalls: 0, // This would need to be tracked in the humor engine
      cacheHits: Math.round(cacheStats.size * cacheStats.hitRate),
      averageResponseTime: 0, // This would need to be tracked
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Clear all cached humor responses
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * Reset all statistics and metrics
   */
  resetStats(): void {
    this.loggerInterceptor.resetStats();
    this.clearCache();
  }

  /**
   * Cleanup resources and restore original console.log
   * Should be called when the library is no longer needed
   */
  cleanup(): void {
    if (this.isEnabled) {
      this.disable();
    }
    
    this.clearCache();
    this.isInitialized = false;
  }

  /**
   * Get detailed status information for debugging
   */
  getStatus(): {
    initialized: boolean;
    enabled: boolean;
    hasApiKey: boolean;
    apiAvailable: boolean;
    cacheSize: number;
    totalLogs: number;
  } {
    return {
      initialized: this.isInitialized,
      enabled: this.isEnabled,
      hasApiKey: this.configManager.hasApiKey(),
      apiAvailable: this.anthropicClient.isAvailable(),
      cacheSize: this.cacheManager.getStats().size,
      totalLogs: this.loggerInterceptor.getStats().totalLogs
    };
  }

  /**
   * Initialize all components with proper dependency injection
   */
  private initializeComponents(): void {
    const config = this.configManager.getConfig();

    // Initialize core components
    this.contentAnalyzer = new ContentAnalyzer();
    this.humorDatabase = new HumorDatabase();
    this.cacheManager = new CacheManager(config.cacheSize);
    this.anthropicClient = new AnthropicClient(config);

    // Initialize humor engine with all dependencies
    this.humorEngine = new HumorEngine(
      this.contentAnalyzer,
      this.humorDatabase,
      this.anthropicClient,
      this.cacheManager,
      config
    );

    // Initialize logger interceptor with all dependencies
    this.loggerInterceptor = new LoggerInterceptor(
      this.humorEngine,
      this.configManager,
      this.contentAnalyzer
    );
  }

  /**
   * Estimate total memory usage of the library
   */
  private estimateMemoryUsage(): number {
    // This is a rough estimation
    const cacheStats = this.cacheManager.getDetailedStats();
    return cacheStats.memoryUsage + 1024 * 1024; // Cache + ~1MB for other components
  }
}

// Default export for easy importing
export default ConsoleRoast;