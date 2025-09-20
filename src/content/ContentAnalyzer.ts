import { ContentAnalysis, IContentAnalyzer } from '../../types';

/**
 * ContentAnalyzer class for analyzing and categorizing logged content
 */
export class ContentAnalyzer implements IContentAnalyzer {
  private readonly sensitivePatterns: RegExp[] = [
    // API keys and tokens - more specific patterns
    /api[_-]?key[_-]?[=:]\s*['"]*([A-Za-z0-9\-._~+/]{10,})['"]*\b/gi,
    /token[_-]?[=:]\s*['"]*([A-Za-z0-9\-._~+/]{10,})['"]*\b/gi,
    /bearer\s+([A-Za-z0-9\-._~+/]{10,})/gi,
    /\bsk-[A-Za-z0-9]{10,}/gi, // OpenAI/Anthropic style keys
    
    // Passwords
    /password[_-]?[=:]\s*['"]*([^'"\s]+)['"]*\b/gi,
    /pwd[_-]?[=:]\s*['"]*([^'"\s]+)['"]*\b/gi,
    /pass[_-]?[=:]\s*['"]*([^'"\s]+)['"]*\b/gi,
    
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Credit card numbers
    /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    
    // Social security numbers
    /\b\d{3}-?\d{2}-?\d{4}\b/g,
    
    // Phone numbers
    /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    
    // IP addresses (private ranges)
    /\b(?:10\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
    /\b(?:172\.(?:1[6-9]|2[0-9]|3[0-1])\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
    /\b(?:192\.168\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g,
  ];

  private readonly errorPatterns: RegExp[] = [
    /error/gi,
    /exception/gi,
    /failed/gi,
    /failure/gi,
    /crash/gi,
    /fatal/gi,
    /critical/gi,
    /warning/gi,
    /warn/gi,
    /stack trace/gi,
    /\bat\s+.*:\d+:\d+/g, // Stack trace lines
    /\s+at\s+/g, // Stack trace continuation
  ];

  private readonly successPatterns: RegExp[] = [
    /success/gi,
    /complete/gi,
    /finished/gi,
    /done/gi,
    /ok/gi,
    /passed/gi,
    /resolved/gi,
    /connected/gi,
  ];

  private readonly developerPatterns: RegExp[] = [
    /console\.log/gi,
    /debug/gi,
    /trace/gi,
    /info/gi,
    /log/gi,
    /\bapi\b/gi,
    /\bhttp\b/gi,
    /\bget\b|\bpost\b|\bput\b|\bdelete\b/gi,
    /\bjson\b/gi,
    /\bsql\b/gi,
    /\bdatabase\b/gi,
    /\bdb\b/gi,
    /\bquery\b/gi,
    /\bresponse\b/gi,
    /\brequest\b/gi,
    /\bstatus\b/gi,
    /\bcode\b/gi,
  ];

  /**
   * Analyze logged content and return comprehensive analysis
   */
  analyze(content: any[]): ContentAnalysis {
    const processedContent = this.processContent(content);
    const sanitizedContent = this.sanitize(processedContent);
    
    return {
      dataTypes: this.detectDataTypes(content),
      complexity: this.assessComplexity(content, processedContent),
      isError: this.detectErrors(processedContent),
      sentiment: this.analyzeSentiment(processedContent),
      patterns: this.detectPatterns(processedContent),
      sanitizedContent,
    };
  }

  /**
   * Sanitize content by removing sensitive information
   */
  sanitize(content: string): string {
    let sanitized = content;
    
    // Create fresh regex instances to avoid lastIndex issues
    this.sensitivePatterns.forEach(pattern => {
      const freshPattern = new RegExp(pattern.source, pattern.flags);
      sanitized = sanitized.replace(freshPattern, (match) => {
        // Replace with asterisks of similar length, but cap at 8 characters
        const length = Math.min(match.length, 8);
        return '*'.repeat(length);
      });
    });

    return sanitized;
  }

  /**
   * Process content array into a string representation
   */
  private processContent(content: any[]): string {
    return content.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (typeof item === 'object' && item !== null) {
        try {
          return JSON.stringify(item, null, 2);
        } catch {
          return '[Object object]';
        }
      } else {
        return String(item);
      }
    }).join(' ');
  }

  /**
   * Detect data types present in the content
   */
  private detectDataTypes(content: any[]): string[] {
    const types = new Set<string>();
    
    content.forEach(item => {
      if (item === null) {
        types.add('null');
      } else if (item === undefined) {
        types.add('undefined');
      } else if (Array.isArray(item)) {
        types.add('array');
      } else if (item instanceof Error) {
        types.add('error');
      } else if (item instanceof Date) {
        types.add('date');
      } else if (typeof item === 'object') {
        types.add('object');
      } else {
        types.add(typeof item);
      }
    });

    return Array.from(types);
  }

  /**
   * Assess the complexity of the logged content
   */
  private assessComplexity(content: any[], processedContent: string): 'simple' | 'medium' | 'complex' {
    let complexityScore = 0;

    // Length-based complexity
    if (processedContent.length > 5000) complexityScore += 3;
    else if (processedContent.length > 1000) complexityScore += 2;
    else if (processedContent.length > 50) complexityScore += 1;

    // Number of arguments
    if (content.length > 8) complexityScore += 3;
    else if (content.length > 5) complexityScore += 2;
    else if (content.length > 3) complexityScore += 1;

    // Object depth and structure
    content.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        const depth = this.getObjectDepth(item);
        if (depth > 4) complexityScore += 3;
        else if (depth > 3) complexityScore += 2;
        else if (depth > 1) complexityScore += 1;
      }
    });

    // Special patterns that indicate complexity
    if (this.errorPatterns.some(pattern => pattern.test(processedContent))) {
      complexityScore += 1;
    }

    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 1) return 'medium';
    return 'simple';
  }

  /**
   * Get the depth of an object
   */
  private getObjectDepth(obj: any, depth = 0): number {
    if (depth > 10) return depth; // Prevent infinite recursion
    
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }

    return maxDepth;
  }

  /**
   * Detect if content contains error-related information
   */
  private detectErrors(content: string): boolean {
    // Reset regex lastIndex to ensure consistent behavior
    const patterns = this.errorPatterns.map(pattern => new RegExp(pattern.source, pattern.flags));
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Analyze sentiment of the content
   */
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const lowerContent = content.toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;

    // Check for success patterns
    const successPatterns = this.successPatterns.map(p => new RegExp(p.source, p.flags));
    if (successPatterns.some(pattern => pattern.test(content))) {
      positiveScore += 2;
    }

    // Check for error patterns
    const errorPatterns = this.errorPatterns.map(p => new RegExp(p.source, p.flags));
    if (errorPatterns.some(pattern => pattern.test(content))) {
      negativeScore += 2;
    }

    // Additional positive indicators
    const positiveWords = ['good', 'great', 'awesome', 'perfect', 'working', 'fixed'];
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) positiveScore += 1;
    });

    // Additional negative indicators
    const negativeWords = ['bad', 'terrible', 'broken', 'issue', 'problem', 'bug'];
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) negativeScore += 1;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Detect common developer logging patterns
   */
  private detectPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Check for error patterns
    const errorPatterns = this.errorPatterns.map(p => new RegExp(p.source, p.flags));
    if (errorPatterns.some(pattern => pattern.test(content))) {
      patterns.push('error');
    }

    // Check for success patterns
    const successPatterns = this.successPatterns.map(p => new RegExp(p.source, p.flags));
    if (successPatterns.some(pattern => pattern.test(content))) {
      patterns.push('success');
    }

    // Check for developer patterns
    const developerPatterns = this.developerPatterns.map(p => new RegExp(p.source, p.flags));
    if (developerPatterns.some(pattern => pattern.test(content))) {
      patterns.push('developer');
    }

    // Check for specific data patterns
    if (/\{.*\}/.test(content)) {
      patterns.push('json');
    }

    if (/\[.*\]/.test(content)) {
      patterns.push('array');
    }

    if (/\d{3,}/.test(content)) {
      patterns.push('numeric');
    }

    if (/https?:\/\//.test(content)) {
      patterns.push('url');
    }

    if (/\b\d{4}-\d{2}-\d{2}/.test(content)) {
      patterns.push('date');
    }

    if (/\bfunction\b|\=\>|\bclass\b/.test(content)) {
      patterns.push('code');
    }

    return patterns;
  }
}