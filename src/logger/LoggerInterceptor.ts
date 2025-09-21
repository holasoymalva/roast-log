import {
  ILoggerInterceptor,
  IHumorEngine,
  IConfigurationManager,
  IContentAnalyzer,
  ConsoleRoastConfig,
  LogEntry,
  ContentAnalysis,
} from '../../types';

/**
 * LoggerInterceptor intercepts console.log calls and enhances them with humor
 * while maintaining backward compatibility and providing restore functionality
 */
export class LoggerInterceptor implements ILoggerInterceptor {
  private originalConsoleLog: typeof console.log;
  private humorEngine: IHumorEngine;
  private configManager: IConfigurationManager;
  private contentAnalyzer: IContentAnalyzer;
  private isIntercepted: boolean = false;
  private logCount: number = 0;

  constructor(
    humorEngine: IHumorEngine,
    configManager: IConfigurationManager,
    contentAnalyzer: IContentAnalyzer
  ) {
    this.originalConsoleLog = console.log.bind(console);
    this.humorEngine = humorEngine;
    this.configManager = configManager;
    this.contentAnalyzer = contentAnalyzer;
  }

  /**
   * Intercept console.log calls and replace with enhanced logging
   */
  intercept(): void {
    if (this.isIntercepted) {
      return; // Already intercepted
    }

    // Store the original console.log
    this.originalConsoleLog = console.log.bind(console);
    
    // Replace console.log with our enhanced version
    console.log = (...args: any[]) => {
      this.enhancedLog(args[0], ...args.slice(1));
    };

    this.isIntercepted = true;
  }

  /**
   * Restore original console.log functionality
   */
  restore(): void {
    if (!this.isIntercepted) {
      return; // Not intercepted
    }

    // Restore the original console.log
    console.log = this.originalConsoleLog;
    this.isIntercepted = false;
  }

  /**
   * Enhanced logging method that combines original message with humor
   */
  enhancedLog(message: any, ...args: any[]): void {
    try {
      const config = this.configManager.getConfig();
      
      // If disabled, just use original console.log
      if (!config.enabled) {
        this.originalConsoleLog(message, ...args);
        return;
      }

      // Increment log count for frequency calculation
      this.logCount++;

      // Determine if we should apply humor based on frequency setting
      const shouldApplyHumor = this.shouldApplyHumor(config);

      if (!shouldApplyHumor) {
        // Just log normally without humor
        this.originalConsoleLog(message, ...args);
        return;
      }

      // Process the log entry asynchronously to minimize latency
      this.processLogWithHumor(message, args, config);
    } catch (error) {
      // If anything fails, fall back to original console.log
      this.originalConsoleLog(message, ...args);
    }
  }

  /**
   * Process log entry with humor generation (async to minimize latency)
   */
  private async processLogWithHumor(
    message: any,
    args: any[],
    config: ConsoleRoastConfig
  ): Promise<void> {
    try {
      // First, display the original log immediately to maintain responsiveness
      const allArgs = [message, ...args];
      this.originalConsoleLog(...allArgs);

      // Analyze the content
      const analysis = this.contentAnalyzer.analyze(allArgs);

      // Generate humor asynchronously
      const humorResponse = await this.humorEngine.generateHumor(allArgs, analysis);

      // Display the humorous comment
      if (humorResponse.text) {
        const formattedHumor = this.formatHumorOutput(humorResponse.text, config);
        this.originalConsoleLog(formattedHumor);
      }
    } catch (error) {
      // If humor generation fails, silently continue
      // We don't want to break the logging experience
      console.warn('Humor generation failed:', error);
    }
  }

  /**
   * Determine if humor should be applied based on frequency settings
   */
  private shouldApplyHumor(config: ConsoleRoastConfig): boolean {
    // If frequency is 0, never apply humor
    if (config.frequency === 0) {
      return false;
    }

    // If frequency is 100, always apply humor
    if (config.frequency >= 100) {
      return true;
    }

    // Use a deterministic approach based on log count
    // This ensures consistent behavior across runs
    return (this.logCount % 100) < config.frequency;
  }

  /**
   * Format humor output with appropriate styling
   */
  private formatHumorOutput(humor: string, config: ConsoleRoastConfig): string {
    const prefix = this.getHumorPrefix(config.humorLevel);
    return `${prefix} ${humor}`;
  }

  /**
   * Get appropriate prefix for humor based on level
   */
  private getHumorPrefix(humorLevel: string): string {
    switch (humorLevel) {
      case 'mild':
        return '💭';
      case 'medium':
        return '🤔';
      case 'savage':
        return '🔥';
      default:
        return '•';
    }
  }

  /**
   * Get current interception status
   */
  isCurrentlyIntercepted(): boolean {
    return this.isIntercepted;
  }

  /**
   * Get log statistics
   */
  getStats(): { totalLogs: number; isIntercepted: boolean } {
    return {
      totalLogs: this.logCount,
      isIntercepted: this.isIntercepted,
    };
  }

  /**
   * Reset log count (useful for testing)
   */
  resetStats(): void {
    this.logCount = 0;
  }

  /**
   * Update dependencies (useful when configuration changes)
   */
  updateDependencies(
    humorEngine?: IHumorEngine,
    configManager?: IConfigurationManager,
    contentAnalyzer?: IContentAnalyzer
  ): void {
    if (humorEngine) {
      this.humorEngine = humorEngine;
    }
    if (configManager) {
      this.configManager = configManager;
    }
    if (contentAnalyzer) {
      this.contentAnalyzer = contentAnalyzer;
    }
  }
}