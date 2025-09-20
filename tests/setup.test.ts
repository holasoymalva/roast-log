/**
 * Basic setup test to verify the roast-log project structure is working
 */

import { ConsoleRoastConfig } from '../types';

describe('Project Setup', () => {
  it('should import types correctly', () => {
    const config: ConsoleRoastConfig = {
      humorLevel: 'mild',
      frequency: 50,
      enabled: true,
      cacheSize: 100,
      apiTimeout: 5000,
      fallbackToLocal: true
    };
    
    expect(config.humorLevel).toBe('mild');
    expect(config.frequency).toBe(50);
    expect(config.enabled).toBe(true);
  });

  it('should have correct TypeScript compilation', () => {
    // This test passing means TypeScript compiled successfully
    expect(true).toBe(true);
  });
});