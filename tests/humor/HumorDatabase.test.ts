import { HumorDatabase } from '../../src/humor/HumorDatabase';
import { ContentAnalysis, HumorEntry } from '../../types';

describe('HumorDatabase', () => {
  let humorDatabase: HumorDatabase;

  beforeEach(() => {
    humorDatabase = new HumorDatabase();
  });

  describe('constructor', () => {
    it('should initialize with default humor entries', () => {
      const errorHumor = humorDatabase.getRandomHumor('error', 'mild');
      const successHumor = humorDatabase.getRandomHumor('success', 'mild');
      const dataHumor = humorDatabase.getRandomHumor('data', 'mild');
      const generalHumor = humorDatabase.getRandomHumor('general', 'mild');

      expect(errorHumor).toBeTruthy();
      expect(successHumor).toBeTruthy();
      expect(dataHumor).toBeTruthy();
      expect(generalHumor).toBeTruthy();
    });
  });

  describe('getHumor', () => {
    it('should return humor entries matching humor level', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['string'],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'test message'
      };

      const mildHumor = humorDatabase.getHumor(analysis, 'mild');
      const mediumHumor = humorDatabase.getHumor(analysis, 'medium');
      const savageHumor = humorDatabase.getHumor(analysis, 'savage');

      expect(mildHumor.every(entry => entry.humorLevel === 'mild')).toBe(true);
      expect(mediumHumor.every(entry => entry.humorLevel === 'medium')).toBe(true);
      expect(savageHumor.every(entry => entry.humorLevel === 'savage')).toBe(true);
    });

    it('should return humor entries matching data types', () => {
      const analysis: ContentAnalysis = {
        dataTypes: ['object', 'array'],
        complexity: 'medium',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'some object data'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasDataHumor = humor.some(entry => entry.category === 'data');
      
      expect(hasDataHumor).toBe(true);
    });

    it('should return error humor for error content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: true,
        sentiment: 'negative',
        patterns: ['error'],
        sanitizedContent: 'error occurred'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasErrorHumor = humor.some(entry => entry.category === 'error');
      
      expect(hasErrorHumor).toBe(true);
    });

    it('should return success humor for positive sentiment', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'positive',
        patterns: ['success'],
        sanitizedContent: 'operation completed successfully'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasSuccessHumor = humor.some(entry => entry.category === 'success');
      
      expect(hasSuccessHumor).toBe(true);
    });

    it('should match triggers in sanitized content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'undefined variable detected'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasErrorHumor = humor.some(entry => 
        entry.category === 'error' && 
        entry.triggers.includes('undefined')
      );
      
      expect(hasErrorHumor).toBe(true);
    });

    it('should return general humor for any content', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'random message'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasGeneralHumor = humor.some(entry => entry.category === 'general');
      
      expect(hasGeneralHumor).toBe(true);
    });
  });

  describe('addHumor', () => {
    it('should add new humor entry to database', () => {
      const newEntry: HumorEntry = {
        triggers: ['test'],
        responses: ['Test response'],
        humorLevel: 'mild',
        category: 'general'
      };

      humorDatabase.addHumor(newEntry);

      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'test message'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasNewEntry = humor.some(entry => 
        entry.responses.includes('Test response')
      );
      
      expect(hasNewEntry).toBe(true);
    });
  });

  describe('getRandomHumor', () => {
    it('should return random humor from specified category and level', () => {
      const humor = humorDatabase.getRandomHumor('error', 'mild');
      
      expect(humor).toBeTruthy();
      expect(typeof humor).toBe('string');
    });

    it('should return null for non-existent category', () => {
      const humor = humorDatabase.getRandomHumor('nonexistent', 'mild');
      
      expect(humor).toBeNull();
    });

    it('should return null for non-existent humor level', () => {
      const humor = humorDatabase.getRandomHumor('error', 'nonexistent');
      
      expect(humor).toBeNull();
    });

    it('should return different responses on multiple calls', () => {
      const responses = new Set();
      
      // Call multiple times to check for variety
      for (let i = 0; i < 20; i++) {
        const humor = humorDatabase.getRandomHumor('general', 'mild');
        if (humor) {
          responses.add(humor);
        }
      }
      
      // Should have at least 2 different responses (randomness permitting)
      expect(responses.size).toBeGreaterThan(1);
    });

    it('should return responses matching the requested humor level', () => {
      // Add a custom entry to test specific level matching
      const testEntry: HumorEntry = {
        triggers: ['test'],
        responses: ['Mild test response'],
        humorLevel: 'mild',
        category: 'general'
      };
      
      humorDatabase.addHumor(testEntry);
      
      const mildHumor = humorDatabase.getRandomHumor('general', 'mild');
      const mediumHumor = humorDatabase.getRandomHumor('general', 'medium');
      
      expect(mildHumor).toBeTruthy();
      expect(mediumHumor).toBeTruthy();
      expect(mildHumor).not.toBe(mediumHumor);
    });
  });

  describe('humor level filtering', () => {
    it('should have different humor for each level', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: true,
        sentiment: 'negative',
        patterns: ['error'],
        sanitizedContent: 'error message'
      };

      const mildHumor = humorDatabase.getHumor(analysis, 'mild');
      const mediumHumor = humorDatabase.getHumor(analysis, 'medium');
      const savageHumor = humorDatabase.getHumor(analysis, 'savage');

      expect(mildHumor.length).toBeGreaterThan(0);
      expect(mediumHumor.length).toBeGreaterThan(0);
      expect(savageHumor.length).toBeGreaterThan(0);

      // Verify they're actually different levels
      expect(mildHumor.every(entry => entry.humorLevel === 'mild')).toBe(true);
      expect(mediumHumor.every(entry => entry.humorLevel === 'medium')).toBe(true);
      expect(savageHumor.every(entry => entry.humorLevel === 'savage')).toBe(true);
    });
  });

  describe('category matching', () => {
    it('should match error category for error analysis', () => {
      const errorAnalysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: true,
        sentiment: 'negative',
        patterns: [],
        sanitizedContent: 'some error'
      };

      const humor = humorDatabase.getHumor(errorAnalysis, 'mild');
      const hasErrorCategory = humor.some(entry => entry.category === 'error');
      
      expect(hasErrorCategory).toBe(true);
    });

    it('should match success category for positive sentiment', () => {
      const successAnalysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'positive',
        patterns: [],
        sanitizedContent: 'success message'
      };

      const humor = humorDatabase.getHumor(successAnalysis, 'mild');
      const hasSuccessCategory = humor.some(entry => entry.category === 'success');
      
      expect(hasSuccessCategory).toBe(true);
    });

    it('should match data category when data types are present', () => {
      const dataAnalysis: ContentAnalysis = {
        dataTypes: ['string', 'number'],
        complexity: 'medium',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'data content'
      };

      const humor = humorDatabase.getHumor(dataAnalysis, 'mild');
      const hasDataCategory = humor.some(entry => entry.category === 'data');
      
      expect(hasDataCategory).toBe(true);
    });

    it('should always include general category humor', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'any message'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasGeneralCategory = humor.some(entry => entry.category === 'general');
      
      expect(hasGeneralCategory).toBe(true);
    });
  });

  describe('trigger matching', () => {
    it('should match triggers in patterns', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: ['object', 'array'],
        sanitizedContent: 'some content'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasMatchingTriggers = humor.some(entry => 
        entry.triggers.some(trigger => 
          analysis.patterns.some(pattern => 
            pattern.toLowerCase().includes(trigger.toLowerCase())
          )
        )
      );
      
      expect(hasMatchingTriggers).toBe(true);
    });

    it('should be case insensitive when matching triggers', () => {
      const analysis: ContentAnalysis = {
        dataTypes: [],
        complexity: 'simple',
        isError: false,
        sentiment: 'neutral',
        patterns: [],
        sanitizedContent: 'ERROR occurred'
      };

      const humor = humorDatabase.getHumor(analysis, 'mild');
      const hasErrorHumor = humor.some(entry => 
        entry.category === 'error' && 
        entry.triggers.includes('error')
      );
      
      expect(hasErrorHumor).toBe(true);
    });
  });
});