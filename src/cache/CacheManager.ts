import { ICacheManager, CacheEntry, HumorResponse } from '../../types';
import crypto from 'crypto';

/**
 * LRU Cache implementation for storing humor responses
 * Provides efficient caching with automatic cleanup and size management
 */
export class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private hits: number;
  private misses: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieve a cached response by key
   * Updates access count and moves entry to end (most recently used)
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.hits++;
      // Update access count and timestamp for LRU tracking
      entry.accessCount++;
      entry.timestamp = new Date();
      
      // Move to end (most recently used) by deleting and re-inserting
      this.cache.delete(key);
      this.cache.set(key, entry);
      
      return entry;
    }
    
    this.misses++;
    return null;
  }

  /**
   * Store a humor response in the cache
   * Implements LRU eviction when cache is full
   */
  set(key: string, response: HumorResponse): void {
    // Don't store anything if max size is 0
    if (this.maxSize === 0) {
      return;
    }

    // If key already exists, update it
    if (this.cache.has(key)) {
      const existingEntry = this.cache.get(key)!;
      existingEntry.response = response;
      existingEntry.timestamp = new Date();
      // Don't increment access count on set, only on get
      
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, existingEntry);
      return;
    }

    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry = {
      response,
      timestamp: new Date(),
      accessCount: 0 // Will be incremented on first get
    };

    this.cache.set(key, entry);
  }

  /**
   * Generate a cache key based on content similarity
   * Uses content hash for consistent key generation
   */
  generateKey(content: string): string {
    // Normalize content for better cache hits
    const normalizedContent = this.normalizeContent(content);
    
    // Generate SHA-256 hash for consistent key generation
    return crypto
      .createHash('sha256')
      .update(normalizedContent)
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for shorter keys
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics including size and hit rate
   */
  getStats(): { size: number; hitRate: number } {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * Get detailed cache metrics for monitoring
   */
  getDetailedStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const stats = this.getStats();
    
    return {
      ...stats,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Remove expired entries based on age
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // Default: 24 hours
    const now = new Date();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now.getTime() - entry.timestamp.getTime();
      if (age > maxAgeMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Update cache size limit and evict entries if necessary
   */
  setMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Evict entries if current size exceeds new limit
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Get all cache keys (for testing/debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove least recently used entry from cache
   */
  private evictLRU(): void {
    // Map maintains insertion order, so first entry is least recently used
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Normalize content for better cache key generation
   * Removes whitespace variations and standardizes format
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters for better similarity matching
      .substring(0, 1000); // Limit length to prevent extremely long keys
  }

  /**
   * Estimate memory usage of the cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + entry size
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    return totalSize;
  }
}