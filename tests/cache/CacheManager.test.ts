import { CacheManager } from '../../src/cache/CacheManager';
import { HumorResponse } from '../../types';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  
  const mockHumorResponse: HumorResponse = {
    text: 'Well, well, well... look what we have here!',
    confidence: 0.8,
    source: 'api',
    cached: false
  };

  const mockHumorResponse2: HumorResponse = {
    text: 'Another day, another console.log...',
    confidence: 0.7,
    source: 'local',
    cached: false
  };

  beforeEach(() => {
    cacheManager = new CacheManager(3); // Small cache for testing
  });

  describe('constructor', () => {
    it('should initialize with default max size', () => {
      const defaultCache = new CacheManager();
      expect(defaultCache.getStats().size).toBe(0);
    });

    it('should initialize with custom max size', () => {
      const customCache = new CacheManager(50);
      const stats = customCache.getDetailedStats();
      expect(stats.maxSize).toBe(50);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same content', () => {
      const content = 'Hello world';
      const key1 = cacheManager.generateKey(content);
      const key2 = cacheManager.generateKey(content);
      
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(16);
    });

    it('should generate different keys for different content', () => {
      const key1 = cacheManager.generateKey('Hello world');
      const key2 = cacheManager.generateKey('Goodbye world');
      
      expect(key1).not.toBe(key2);
    });

    it('should normalize content for better cache hits', () => {
      const key1 = cacheManager.generateKey('  Hello   World  ');
      const key2 = cacheManager.generateKey('hello world');
      
      expect(key1).toBe(key2);
    });

    it('should handle special characters in content', () => {
      const content = 'Hello, world! @#$%^&*()';
      const key = cacheManager.generateKey(content);
      
      expect(key).toHaveLength(16);
      expect(typeof key).toBe('string');
    });

    it('should truncate very long content', () => {
      const longContent = 'a'.repeat(2000);
      const key = cacheManager.generateKey(longContent);
      
      expect(key).toHaveLength(16);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve cache entries', () => {
      const key = cacheManager.generateKey('test content');
      
      cacheManager.set(key, mockHumorResponse);
      const entry = cacheManager.get(key);
      
      expect(entry).not.toBeNull();
      expect(entry!.response).toEqual(mockHumorResponse);
      expect(entry!.accessCount).toBe(1);
    });

    it('should return null for non-existent keys', () => {
      const entry = cacheManager.get('non-existent-key');
      expect(entry).toBeNull();
    });

    it('should update access count on retrieval', () => {
      const key = cacheManager.generateKey('test content');
      
      cacheManager.set(key, mockHumorResponse);
      const entry1 = cacheManager.get(key);
      expect(entry1!.accessCount).toBe(1);
      
      const entry2 = cacheManager.get(key);
      expect(entry2!.accessCount).toBe(2);
      
      // Both references point to the same object, so they should be equal
      expect(entry1).toBe(entry2);
    });

    it('should update timestamp on access', (done) => {
      const key = cacheManager.generateKey('test content');
      
      cacheManager.set(key, mockHumorResponse);
      const entry1 = cacheManager.get(key);
      const originalTimestamp = entry1!.timestamp;
      
      setTimeout(() => {
        const entry2 = cacheManager.get(key);
        expect(entry2!.timestamp.getTime()).toBeGreaterThan(originalTimestamp.getTime());
        done();
      }, 10);
    });

    it('should update existing entries', () => {
      const key = cacheManager.generateKey('test content');
      
      cacheManager.set(key, mockHumorResponse);
      cacheManager.set(key, mockHumorResponse2);
      
      const entry = cacheManager.get(key);
      expect(entry!.response).toEqual(mockHumorResponse2);
      expect(cacheManager.getStats().size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      const key1 = cacheManager.generateKey('content1');
      const key2 = cacheManager.generateKey('content2');
      const key3 = cacheManager.generateKey('content3');
      const key4 = cacheManager.generateKey('content4');
      
      // Fill cache to capacity
      cacheManager.set(key1, mockHumorResponse);
      cacheManager.set(key2, mockHumorResponse);
      cacheManager.set(key3, mockHumorResponse);
      
      expect(cacheManager.getStats().size).toBe(3);
      
      // Access key1 to make it recently used
      cacheManager.get(key1);
      
      // Add fourth entry, should evict key2 (least recently used)
      cacheManager.set(key4, mockHumorResponse);
      
      expect(cacheManager.getStats().size).toBe(3);
      expect(cacheManager.get(key1)).not.toBeNull(); // Still exists
      expect(cacheManager.get(key2)).toBeNull(); // Evicted
      expect(cacheManager.get(key3)).not.toBeNull(); // Still exists
      expect(cacheManager.get(key4)).not.toBeNull(); // Newly added
    });

    it('should maintain LRU order correctly', () => {
      const keys = ['key1', 'key2', 'key3'].map(k => cacheManager.generateKey(k));
      
      // Fill cache
      keys.forEach(key => cacheManager.set(key, mockHumorResponse));
      
      // Access in specific order to change LRU
      cacheManager.get(keys[0]); // key1 becomes most recent
      cacheManager.get(keys[1]); // key2 becomes most recent
      // key3 remains least recent
      
      // Add new entry, should evict key3
      const newKey = cacheManager.generateKey('new-key');
      cacheManager.set(newKey, mockHumorResponse);
      
      expect(cacheManager.get(keys[0])).not.toBeNull();
      expect(cacheManager.get(keys[1])).not.toBeNull();
      expect(cacheManager.get(keys[2])).toBeNull(); // Evicted
      expect(cacheManager.get(newKey)).not.toBeNull();
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      const key = cacheManager.generateKey('test content');
      
      // Initial state
      expect(cacheManager.getStats().hitRate).toBe(0);
      
      // Miss
      cacheManager.get(key);
      expect(cacheManager.getStats().hitRate).toBe(0);
      
      // Set and hit
      cacheManager.set(key, mockHumorResponse);
      cacheManager.get(key);
      
      const stats = cacheManager.getDetailedStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should calculate hit rate correctly', () => {
      const key1 = cacheManager.generateKey('content1');
      const key2 = cacheManager.generateKey('content2');
      
      cacheManager.set(key1, mockHumorResponse);
      
      // 2 hits, 1 miss = 66.67% hit rate
      cacheManager.get(key1); // hit
      cacheManager.get(key1); // hit
      cacheManager.get(key2); // miss
      
      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(0.67);
    });

    it('should return detailed statistics', () => {
      const key = cacheManager.generateKey('test content');
      cacheManager.set(key, mockHumorResponse);
      cacheManager.get(key);
      
      const stats = cacheManager.getDetailedStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('memoryUsage');
      
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(3);
      expect(stats.hits).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should clear all entries', () => {
      const key1 = cacheManager.generateKey('content1');
      const key2 = cacheManager.generateKey('content2');
      
      cacheManager.set(key1, mockHumorResponse);
      cacheManager.set(key2, mockHumorResponse);
      
      expect(cacheManager.getStats().size).toBe(2);
      
      cacheManager.clear();
      
      expect(cacheManager.getStats().size).toBe(0);
      expect(cacheManager.get(key1)).toBeNull();
      expect(cacheManager.get(key2)).toBeNull();
    });

    it('should reset statistics when cleared', () => {
      const key = cacheManager.generateKey('test content');
      
      cacheManager.set(key, mockHumorResponse);
      cacheManager.get(key);
      cacheManager.get('non-existent');
      
      expect(cacheManager.getDetailedStats().hits).toBe(1);
      expect(cacheManager.getDetailedStats().misses).toBe(1);
      
      cacheManager.clear();
      
      const stats = cacheManager.getDetailedStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should cleanup expired entries', (done) => {
      const key1 = cacheManager.generateKey('content1');
      const key2 = cacheManager.generateKey('content2');
      
      cacheManager.set(key1, mockHumorResponse);
      
      setTimeout(() => {
        cacheManager.set(key2, mockHumorResponse);
        
        // Cleanup entries older than 50ms
        const removedCount = cacheManager.cleanup(50);
        
        expect(removedCount).toBe(1);
        expect(cacheManager.get(key1)).toBeNull(); // Expired
        expect(cacheManager.get(key2)).not.toBeNull(); // Still valid
        done();
      }, 100);
    });

    it('should update max size and evict if necessary', () => {
      const keys = ['key1', 'key2', 'key3'].map(k => cacheManager.generateKey(k));
      
      // Fill cache to capacity (3)
      keys.forEach(key => cacheManager.set(key, mockHumorResponse));
      expect(cacheManager.getStats().size).toBe(3);
      
      // Reduce max size to 2
      cacheManager.setMaxSize(2);
      
      expect(cacheManager.getStats().size).toBe(2);
      expect(cacheManager.getDetailedStats().maxSize).toBe(2);
    });
  });

  describe('utility methods', () => {
    it('should return all cache keys', () => {
      const key1 = cacheManager.generateKey('content1');
      const key2 = cacheManager.generateKey('content2');
      
      cacheManager.set(key1, mockHumorResponse);
      cacheManager.set(key2, mockHumorResponse);
      
      const keys = cacheManager.getKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain(key1);
      expect(keys).toContain(key2);
    });

    it('should check if key exists', () => {
      const key = cacheManager.generateKey('test content');
      
      expect(cacheManager.has(key)).toBe(false);
      
      cacheManager.set(key, mockHumorResponse);
      
      expect(cacheManager.has(key)).toBe(true);
    });
  });

  describe('memory management', () => {
    it('should estimate memory usage', () => {
      const key = cacheManager.generateKey('test content');
      cacheManager.set(key, mockHumorResponse);
      
      const stats = cacheManager.getDetailedStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
      
      // Add more entries and verify memory usage increases
      const key2 = cacheManager.generateKey('more content');
      cacheManager.set(key2, mockHumorResponse2);
      
      const newStats = cacheManager.getDetailedStats();
      expect(newStats.memoryUsage).toBeGreaterThan(stats.memoryUsage);
    });

    it('should handle large cache sizes efficiently', () => {
      const largeCache = new CacheManager(1000);
      const startTime = Date.now();
      
      // Add many entries
      for (let i = 0; i < 500; i++) {
        const key = largeCache.generateKey(`content-${i}`);
        largeCache.set(key, mockHumorResponse);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(largeCache.getStats().size).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const key = cacheManager.generateKey('');
      expect(key).toHaveLength(16);
      
      cacheManager.set(key, mockHumorResponse);
      const entry = cacheManager.get(key);
      expect(entry).not.toBeNull();
    });

    it('should handle unicode content', () => {
      const unicodeContent = '🚀 Hello 世界 🌟';
      const key = cacheManager.generateKey(unicodeContent);
      
      cacheManager.set(key, mockHumorResponse);
      const entry = cacheManager.get(key);
      expect(entry).not.toBeNull();
    });

    it('should handle cache size of 0', () => {
      const zeroCache = new CacheManager(0);
      const key = zeroCache.generateKey('test');
      
      zeroCache.set(key, mockHumorResponse);
      expect(zeroCache.getStats().size).toBe(0);
      expect(zeroCache.get(key)).toBeNull();
    });

    it('should handle cache size of 1', () => {
      const singleCache = new CacheManager(1);
      const key1 = singleCache.generateKey('content1');
      const key2 = singleCache.generateKey('content2');
      
      singleCache.set(key1, mockHumorResponse);
      expect(singleCache.getStats().size).toBe(1);
      
      singleCache.set(key2, mockHumorResponse2);
      expect(singleCache.getStats().size).toBe(1);
      expect(singleCache.get(key1)).toBeNull(); // Evicted
      expect(singleCache.get(key2)).not.toBeNull(); // Current
    });
  });
});