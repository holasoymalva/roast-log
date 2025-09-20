import Anthropic from "@anthropic-ai/sdk";
import {
  IAnthropicClient,
  ApiResponse,
  ContentAnalysis,
  ConsoleRoastConfig,
} from "../../types";

/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half-open",
}

/**
 * Rate limiting information
 */
interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  requestsPerMinute: number;
}

/**
 * Anthropic API client with rate limiting, retry logic, and circuit breaker
 */
export class AnthropicClient implements IAnthropicClient {
  private client: Anthropic | null = null;
  private config: ConsoleRoastConfig;
  private rateLimitInfo: RateLimitInfo;
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private readonly maxFailures: number = 5;
  private readonly circuitBreakerTimeout: number = 60000; // 1 minute
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second

  constructor(config: ConsoleRoastConfig) {
    this.config = config;
    this.rateLimitInfo = {
      remaining: 100,
      resetTime: new Date(Date.now() + 60000),
      requestsPerMinute: 100,
    };

    if (config.apiKey) {
      try {
        this.client = new Anthropic({
          apiKey: config.apiKey,
        });
      } catch (error) {
        console.warn("Failed to initialize Anthropic client:", error);
      }
    }
  }

  /**
   * Generate humor using Anthropic API with retry logic and circuit breaker
   */
  async generateHumor(
    content: string,
    context: ContentAnalysis
  ): Promise<ApiResponse> {
    const startTime = Date.now();

    // Check if circuit breaker is open
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
      } else {
        return {
          success: false,
          error: "Circuit breaker is open - API temporarily unavailable",
          responseTime: Date.now() - startTime,
        };
      }
    }

    // Check if client is available
    if (!this.isAvailable()) {
      return {
        success: false,
        error: "Anthropic client not available - missing API key",
        responseTime: Date.now() - startTime,
      };
    }

    // Check rate limits
    if (
      this.rateLimitInfo.remaining <= 0 &&
      new Date() < this.rateLimitInfo.resetTime
    ) {
      return {
        success: false,
        error: "Rate limit exceeded",
        responseTime: Date.now() - startTime,
      };
    }

    // Attempt API call with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeApiCall(content, context);

        // Success - reset circuit breaker
        this.onSuccess();

        return {
          success: true,
          humor: response,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;

        if (isLastAttempt) {
          this.onFailure();
          return {
            success: false,
            error: this.getErrorMessage(error),
            responseTime: Date.now() - startTime,
          };
        }

        // Wait before retry with exponential backoff
        await this.delay(this.baseDelay * Math.pow(2, attempt - 1));
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: "Unexpected error",
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Make the actual API call to Anthropic
   */
  private async makeApiCall(
    content: string,
    context: ContentAnalysis
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Anthropic client not initialized");
    }

    const prompt = this.buildPrompt(content, context);

    const response = await Promise.race([
      this.client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      this.createTimeoutPromise(),
    ]);

    // Update rate limit info (simplified - in real implementation, parse from headers)
    this.updateRateLimitInfo();

    if (!response.content || response.content.length === 0) {
      throw new Error("Empty response from API");
    }

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || !("text" in textContent)) {
      throw new Error("No text content in API response");
    }

    return this.validateAndFormatResponse(textContent.text);
  }

  /**
   * Build the prompt for humor generation
   */
  private buildPrompt(content: string, context: ContentAnalysis): string {
    const humorLevelInstructions = {
      mild: "Be gentle and encouraging, like a supportive colleague.",
      medium: "Be witty and playful, with light teasing.",
      savage: "Be sarcastic and brutally honest, but still professional.",
    };

    const contextInfo = this.buildContextInfo(context);

    return `You are a witty programming assistant that adds humorous comments to console.log statements. 

Humor Level: ${this.config.humorLevel} - ${
      humorLevelInstructions[this.config.humorLevel]
    }

Context: ${contextInfo}

Logged Content: "${content}"

Generate a brief, humorous comment (max 100 characters) that a developer would find amusing. The comment should be:
- In English
- Professional but entertaining
- Contextually relevant to what was logged
- Appropriate for a work environment

Respond with ONLY the humorous comment, no explanations or quotes.`;
  }

  /**
   * Build context information for the prompt
   */
  private buildContextInfo(context: ContentAnalysis): string {
    const info = [];

    if (context.isError) {
      info.push("This appears to be an error or exception");
    }

    if (context.dataTypes.length > 0) {
      info.push(`Data types: ${context.dataTypes.join(", ")}`);
    }

    if (context.complexity !== "simple") {
      info.push(`Complexity: ${context.complexity}`);
    }

    if (context.sentiment !== "neutral") {
      info.push(`Sentiment: ${context.sentiment}`);
    }

    if (context.patterns.length > 0) {
      info.push(`Patterns: ${context.patterns.join(", ")}`);
    }

    return info.length > 0 ? info.join(", ") : "General logging";
  }

  /**
   * Validate and format the API response
   */
  private validateAndFormatResponse(response: string): string {
    // Remove quotes if present
    let formatted = response.trim().replace(/^["']|["']$/g, "");

    // Ensure it's not too long
    if (formatted.length > 150) {
      formatted = formatted.substring(0, 147) + "...";
    }

    // Ensure it's not empty
    if (!formatted) {
      throw new Error("Empty humor response");
    }

    return formatted;
  }

  /**
   * Create a timeout promise for API calls
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`API request timeout after ${this.config.apiTimeout}ms`)
        );
      }, this.config.apiTimeout);
    });
  }

  /**
   * Handle successful API call
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
  }

  /**
   * Handle failed API call
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.maxFailures) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
    }
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.circuitBreakerTimeout;
  }

  /**
   * Update rate limit information (simplified implementation)
   */
  private updateRateLimitInfo(): void {
    this.rateLimitInfo.remaining = Math.max(
      0,
      this.rateLimitInfo.remaining - 1
    );

    // Reset if time has passed
    if (new Date() >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.remaining = this.rateLimitInfo.requestsPerMinute;
      this.rateLimitInfo.resetTime = new Date(Date.now() + 60000);
    }
  }

  /**
   * Get error message from various error types
   */
  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    return "Unknown API error";
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    // In test environment, use minimal delay
    const delayTime = process.env.NODE_ENV === "test" ? 1 : ms;
    return new Promise((resolve) => setTimeout(resolve, delayTime));
  }

  /**
   * Check if API is available
   */
  isAvailable(): boolean {
    return this.client !== null && !!this.config.apiKey;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number; resetTime: Date } {
    return {
      remaining: this.rateLimitInfo.remaining,
      resetTime: this.rateLimitInfo.resetTime,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: ConsoleRoastConfig): void {
    const oldApiKey = this.config.apiKey;
    this.config = config;

    // Reinitialize client if API key changed
    if (config.apiKey && config.apiKey !== oldApiKey) {
      try {
        this.client = new Anthropic({
          apiKey: config.apiKey,
        });
      } catch (error) {
        console.warn("Failed to reinitialize Anthropic client:", error);
        this.client = null;
      }
    } else if (!config.apiKey) {
      this.client = null;
    }
  }

  /**
   * Get circuit breaker status for debugging
   */
  getCircuitBreakerStatus(): {
    state: string;
    failureCount: number;
    lastFailureTime: Date | null;
  } {
    return {
      state: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
