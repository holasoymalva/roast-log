import { ContentAnalyzer } from '../../src/content/ContentAnalyzer';
import { ContentAnalysis } from '../../types';

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze simple string content', () => {
      const content = ['Hello world'];
      const result = analyzer.analyze(content);

      expect(result.dataTypes).toContain('string');
      expect(result.complexity).toBe('simple');
      expect(result.isError).toBe(false);
      expect(result.sentiment).toBe('neutral');
      expect(result.sanitizedContent).toBe('Hello world');
    });

    it('should detect multiple data types', () => {
      const content = ['string', 42, true, null, undefined, [], {}];
      const result = analyzer.analyze(content);

      expect(result.dataTypes).toContain('string');
      expect(result.dataTypes).toContain('number');
      expect(result.dataTypes).toContain('boolean');
      expect(result.dataTypes).toContain('null');
      expect(result.dataTypes).toContain('undefined');
      expect(result.dataTypes).toContain('array');
      expect(result.dataTypes).toContain('object');
    });

    it('should detect error content', () => {
      const content = ['Error: Something went wrong', new Error('Test error')];
      const result = analyzer.analyze(content);

      expect(result.isError).toBe(true);
      expect(result.sentiment).toBe('negative');
      expect(result.patterns).toContain('error');
      expect(result.dataTypes).toContain('error');
    });

    it('should detect success content', () => {
      const content = ['Operation completed successfully'];
      const result = analyzer.analyze(content);

      expect(result.isError).toBe(false);
      expect(result.sentiment).toBe('positive');
      expect(result.patterns).toContain('success');
    });

    it('should assess complexity correctly', () => {
      // Simple content
      const simpleContent = ['test'];
      expect(analyzer.analyze(simpleContent).complexity).toBe('simple');

      // Medium complexity - adjust expectation based on actual scoring
      const mediumContent = ['test', { key: 'value' }, 'more content', 'extra arg'];
      expect(analyzer.analyze(mediumContent).complexity).toBe('medium');

      // Complex content
      const complexContent = [
        'very long content '.repeat(50),
        { deep: { nested: { object: { with: { many: { levels: true } } } } } },
        'arg1', 'arg2', 'arg3', 'arg4', 'arg5', 'arg6'
      ];
      expect(analyzer.analyze(complexContent).complexity).toBe('complex');
    });

    it('should detect JSON patterns', () => {
      const content = ['{"key": "value", "number": 42}'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('json');
    });

    it('should detect array patterns', () => {
      const content = ['[1, 2, 3, 4, 5]'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('array');
    });

    it('should detect URL patterns', () => {
      const content = ['Fetching data from https://api.example.com/users'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('url');
    });

    it('should detect date patterns', () => {
      const content = ['Event scheduled for 2024-12-25'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('date');
    });

    it('should detect developer patterns', () => {
      const content = ['API response received', 'Database query executed'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('developer');
    });

    it('should detect numeric patterns', () => {
      const content = ['Processing 12345 records'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('numeric');
    });

    it('should detect code patterns', () => {
      const content = ['function test() { return true; }'];
      const result = analyzer.analyze(content);

      expect(result.patterns).toContain('code');
    });
  });

  describe('sanitize', () => {
    it('should remove API keys', () => {
      const content = 'API key: sk-1234567890abcdef1234567890abcdef';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('sk-1234567890abcdef1234567890abcdef');
      expect(result).toContain('*');
    });

    it('should remove tokens', () => {
      const content = 'Bearer token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).toContain('*');
    });

    it('should remove passwords', () => {
      const content = 'password=secretpassword123';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('secretpassword123');
      expect(result).toContain('*');
    });

    it('should remove email addresses', () => {
      const content = 'User email: user@example.com';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('user@example.com');
      expect(result).toContain('*');
    });

    it('should remove credit card numbers', () => {
      const content = 'Card: 4532-1234-5678-9012';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('4532-1234-5678-9012');
      expect(result).toContain('*');
    });

    it('should remove phone numbers', () => {
      const content = 'Call me at (555) 123-4567';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('(555) 123-4567');
      expect(result).toContain('*');
    });

    it('should remove private IP addresses', () => {
      const content = 'Server at 192.168.1.100';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('192.168.1.100');
      expect(result).toContain('*');
    });

    it('should preserve non-sensitive content', () => {
      const content = 'This is a normal log message with no sensitive data';
      const result = analyzer.sanitize(content);

      expect(result).toBe(content);
    });

    it('should handle multiple sensitive patterns', () => {
      const content = 'User user@example.com with password=secret123 and API key sk-abcdef123456';
      const result = analyzer.sanitize(content);

      expect(result).not.toContain('user@example.com');
      expect(result).not.toContain('secret123');
      expect(result).not.toContain('sk-abcdef123456');
      expect(result).toContain('*');
    });
  });

  describe('data type detection', () => {
    it('should detect string type', () => {
      const result = analyzer.analyze(['hello']);
      expect(result.dataTypes).toContain('string');
    });

    it('should detect number type', () => {
      const result = analyzer.analyze([42, 3.14]);
      expect(result.dataTypes).toContain('number');
    });

    it('should detect boolean type', () => {
      const result = analyzer.analyze([true, false]);
      expect(result.dataTypes).toContain('boolean');
    });

    it('should detect null type', () => {
      const result = analyzer.analyze([null]);
      expect(result.dataTypes).toContain('null');
    });

    it('should detect undefined type', () => {
      const result = analyzer.analyze([undefined]);
      expect(result.dataTypes).toContain('undefined');
    });

    it('should detect array type', () => {
      const result = analyzer.analyze([[1, 2, 3]]);
      expect(result.dataTypes).toContain('array');
    });

    it('should detect object type', () => {
      const result = analyzer.analyze([{ key: 'value' }]);
      expect(result.dataTypes).toContain('object');
    });

    it('should detect error type', () => {
      const result = analyzer.analyze([new Error('test')]);
      expect(result.dataTypes).toContain('error');
    });

    it('should detect date type', () => {
      const result = analyzer.analyze([new Date()]);
      expect(result.dataTypes).toContain('date');
    });
  });

  describe('sentiment analysis', () => {
    it('should detect positive sentiment', () => {
      const positiveContent = ['Success! Operation completed successfully'];
      const result = analyzer.analyze(positiveContent);
      expect(result.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const negativeContent = ['Error: Operation failed with critical exception'];
      const result = analyzer.analyze(negativeContent);
      expect(result.sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const neutralContent = ['Processing data...'];
      const result = analyzer.analyze(neutralContent);
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle mixed sentiment with positive bias', () => {
      const mixedContent = ['Error occurred but was fixed successfully'];
      const result = analyzer.analyze(mixedContent);
      expect(result.sentiment).toBe('positive');
    });
  });

  describe('complexity assessment', () => {
    it('should handle circular references without infinite recursion', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      const result = analyzer.analyze([circular]);
      expect(result.complexity).toBeDefined();
      expect(['simple', 'medium', 'complex']).toContain(result.complexity);
    });

    it('should assess deep nested objects as complex', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep'
              }
            }
          }
        }
      };
      
      const result = analyzer.analyze([deepObject]);
      expect(result.complexity).toBe('complex');
    });

    it('should consider many arguments as more complex', () => {
      const manyArgs = Array(10).fill('arg');
      const result = analyzer.analyze(manyArgs);
      expect(['medium', 'complex']).toContain(result.complexity);
    });
  });

  describe('error detection', () => {
    it('should detect various error keywords', () => {
      const errorKeywords = [
        'Error occurred',
        'Exception thrown',
        'Operation failed',
        'Critical failure',
        'Fatal crash',
        'Warning message'
      ];

      errorKeywords.forEach(keyword => {
        const result = analyzer.analyze([keyword]);
        expect(result.isError).toBe(true);
      });
    });

    it('should detect stack traces', () => {
      const stackTrace = `
        Error: Something went wrong
            at Object.test (/path/to/file.js:10:5)
            at Module._compile (module.js:456:26)
      `;
      
      const result = analyzer.analyze([stackTrace]);
      expect(result.isError).toBe(true);
      expect(result.patterns).toContain('error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content array', () => {
      const result = analyzer.analyze([]);
      expect(result.dataTypes).toEqual([]);
      expect(result.complexity).toBe('simple');
      expect(result.sanitizedContent).toBe('');
    });

    it('should handle non-serializable objects', () => {
      const circular: any = {};
      circular.self = circular;
      
      const result = analyzer.analyze([circular]);
      expect(result.sanitizedContent).toContain('[Object object]');
    });

    it('should handle very large content', () => {
      const largeContent = 'x'.repeat(10000);
      const result = analyzer.analyze([largeContent]);
      expect(result.complexity).toBe('medium'); // Large content gets medium complexity
      expect(result.sanitizedContent).toBe(largeContent);
    });

    it('should handle mixed content types', () => {
      const mixedContent = [
        'string',
        42,
        { key: 'value' },
        [1, 2, 3],
        null,
        undefined,
        true,
        new Date(),
        new Error('test')
      ];
      
      const result = analyzer.analyze(mixedContent);
      expect(result.dataTypes.length).toBeGreaterThan(5);
      expect(result.complexity).toBe('complex');
    });
  });
});