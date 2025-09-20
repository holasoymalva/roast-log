import {
  IHumorEngine,
  IContentAnalyzer,
  IHumorDatabase,
  IAnthropicClient,
  ICacheManager,
  ContentAnalysis,
  HumorResponse,
  ConsoleRoastConfig,
} from '../../types';

/**
 * HumorEngine orchestrates all humor generation by coordinating between
 * API and local humor sources, managing caching, and providing fallback mechanisms
 */
export class HumorEngine implements IHumorEngine {
  private contentAnalyzer: IContentAnalyzer;
  private humorDatabase: IHumorDatabase;
  private anthropicClient: IAnthropicClient;
  private cacheManager: ICacheManager;
  private config: ConsoleRoastConfig;

  constructor(
    contentAnalyzer: IContentAnalyzer,
    humorDatabase: IHumorDatabase,
    anthropicClient: IAnthropicClient,
    cacheManager: ICacheManager,
    config: ConsoleRoastConfig
  ) {
    this.contentAnalyzer = contentAnalyzer;
    this.humorDatabase = humorDatabase;
    this.anthropicClient = anthropicClient;
    this.cacheManager = cacheManager;
    this.config = config;
  }

  /**
   * Generate humor for given content using the best available source
   */
  async generateHumor(content: any[], analysis: ContentAnalysis): Promise<HumorResponse> {
    let cacheKey: string | null = null;
    
    // Check cache first (with error handling)
    try {
      cacheKey = this.generateCacheKey(content, analysis);
      const cachedResponse = this.cacheManager.get(cacheKey);
      
      if (cachedResponse) {
        return {
          ...cachedResponse.response,
          cached: true,
        };
      }
    } catch (error) {
      // Log cache error but continue with humor generation
      console.warn('Cache error during humor generation:', error);
      cacheKey = null; // Disable caching for this request
    }

    // Try API first if available and enabled
    if (this.shouldUseApi()) {
      try {
        const apiResponse = await this.generateFromApi(analysis);
        if (apiResponse.success && apiResponse.humor) {
          const humorResponse: HumorResponse = {
            text: apiResponse.humor,
            confidence: 0.9,
            source: 'api',
            cached: false,
          };

          // Cache the successful response (with error handling)
          if (cacheKey) {
            try {
              this.cacheManager.set(cacheKey, humorResponse);
            } catch (error) {
              console.warn('Cache error during response storage:', error);
            }
          }
          return humorResponse;
        }
      } catch (error) {
        // Log error but continue to fallback
        console.warn('API humor generation failed:', error);
      }
    }

    // Fallback to local humor database
    const localHumor = this.generateFromLocal(analysis);
    
    // Cache local humor too (with lower confidence)
    const humorResponse: HumorResponse = {
      text: localHumor,
      confidence: 0.7,
      source: 'local',
      cached: false,
    };

    // Cache with error handling
    if (cacheKey) {
      try {
        this.cacheManager.set(cacheKey, humorResponse);
      } catch (error) {
        console.warn('Cache error during response storage:', error);
      }
    }
    
    return humorResponse;
  }

  /**
   * Select appropriate humor type based on content analysis
   */
  selectHumorType(analysis: ContentAnalysis): string {
    // Determine category based on analysis
    if (analysis.isError || analysis.sentiment === 'negative') {
      return 'error';
    }
    
    if (analysis.sentiment === 'positive') {
      return 'success';
    }
    
    // Only consider it data type if it has complex data structures or specific data patterns
    if (analysis.patterns.includes('json') || analysis.patterns.includes('array') || 
        analysis.dataTypes.includes('object') || analysis.dataTypes.includes('array')) {
      return 'data';
    }
    
    return 'general';
  }

  /**
   * Format response combining original message with humor
   */
  formatResponse(humor: string, original: string): string {
    // Different formatting styles based on humor level
    switch (this.config.humorLevel) {
      case 'mild':
        return `${original} 💭 ${humor}`;
      case 'medium':
        return `${original} 🤔 ${humor}`;
      case 'savage':
        return `${original} 🔥 ${humor}`;
      default:
        return `${original} • ${humor}`;
    }
  }

  /**
   * Update configuration and propagate to dependencies
   */
  updateConfig(config: ConsoleRoastConfig): void {
    this.config = config;
    
    // Update Anthropic client configuration
    this.anthropicClient.updateConfig(config);
    
    // Update cache size if needed
    this.cacheManager.setMaxSize(config.cacheSize);
  }

  /**
   * Get performance metrics from the humor engine
   */
  getMetrics(): {
    cacheStats: { size: number; hitRate: number };
    apiStatus: { available: boolean; rateLimitRemaining: number };
  } {
    return {
      cacheStats: this.cacheManager.getStats(),
      apiStatus: {
        available: this.anthropicClient.isAvailable(),
        rateLimitRemaining: this.anthropicClient.getRateLimitStatus().remaining,
      },
    };
  }

  /**
   * Clear all cached humor responses
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * Determine if API should be used based on configuration and availability
   */
  private shouldUseApi(): boolean {
    return (
      this.config.apiKey !== undefined &&
      this.anthropicClient.isAvailable() &&
      this.config.fallbackToLocal !== false // Allow API usage unless explicitly disabled
    );
  }

  /**
   * Generate humor using Anthropic API
   */
  private async generateFromApi(analysis: ContentAnalysis): Promise<{ success: boolean; humor?: string }> {
    try {
      const response = await this.anthropicClient.generateHumor(
        analysis.sanitizedContent,
        analysis
      );
      
      return {
        success: response.success,
        humor: response.humor,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  }

  /**
   * Generate humor using local database
   */
  private generateFromLocal(analysis: ContentAnalysis): string {
    const humorType = this.selectHumorType(analysis);
    
    // Try to get specific humor for the analysis
    const matchingHumor = this.humorDatabase.getHumor(analysis, this.config.humorLevel);
    
    if (matchingHumor.length > 0) {
      // Select random humor from matching entries
      const randomEntry = matchingHumor[Math.floor(Math.random() * matchingHumor.length)];
      const randomResponse = randomEntry.responses[Math.floor(Math.random() * randomEntry.responses.length)];
      return randomResponse;
    }
    
    // Fallback to category-based humor
    const categoryHumor = this.humorDatabase.getRandomHumor(humorType, this.config.humorLevel);
    if (categoryHumor) {
      return categoryHumor;
    }
    
    // Final fallback to general humor
    const generalHumor = this.humorDatabase.getRandomHumor('general', this.config.humorLevel);
    if (generalHumor) {
      return generalHumor;
    }
    
    // Ultimate fallback
    return this.getUltimateFallback();
  }

  /**
   * Generate cache key based on content and analysis
   */
  private generateCacheKey(content: any[], analysis: ContentAnalysis): string {
    // Create a normalized representation for caching
    const contentString = content.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (typeof item === 'object' && item !== null) {
        try {
          return JSON.stringify(item);
        } catch {
          return '[Object]';
        }
      } else {
        return String(item);
      }
    }).join(' ');

    // Include relevant analysis factors in the key
    const keyFactors = [
      contentString,
      analysis.dataTypes.join(','),
      analysis.complexity,
      analysis.isError.toString(),
      analysis.sentiment,
      analysis.patterns.join(','),
      this.config.humorLevel,
    ].join('|');

    return this.cacheManager.generateKey(keyFactors);
  }

  /**
   * Get ultimate fallback humor when all else fails
   */
  private getUltimateFallback(): string {
    const fallbacks = {
      mild: [
        "Well, that's interesting! 🤔",
        "Noted and logged! 📝",
        "Another day, another log entry!",
        "Console.log: the developer's faithful companion",
        "Logging in progress... carry on! ✨",
      ],
      medium: [
        "Console.log: because printf debugging never goes out of style!",
        "Another entry in the digital diary of development",
        "Your console is chattier than a coffee shop on Monday morning ☕",
        "Debugging: the art of talking to yourself through code",
        "Console.log: turning developers into digital detectives since forever 🕵️",
      ],
      savage: [
        "Console.log: because real debuggers are for people who plan ahead",
        "Another log entry in the epic saga of 'Why Doesn't This Work?'",
        "Your console has more drama than a reality TV show 📺",
        "Console.log: the developer's equivalent of talking to themselves",
        "Debugging: the fine art of staring at code until it confesses 👁️",
      ],
    };

    const levelFallbacks = fallbacks[this.config.humorLevel] || fallbacks.mild;
    return levelFallbacks[Math.floor(Math.random() * levelFallbacks.length)];
  }
}