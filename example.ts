/**
 * TypeScript example demonstrating roast-log usage with type safety
 */

import ConsoleRoast, { ConsoleRoastConfig } from './src/index';

// Create configuration with full type safety
const config: Partial<ConsoleRoastConfig> = {
  humorLevel: 'savage',
  frequency: 75,
  enabled: true,
  cacheSize: 50,
  fallbackToLocal: true
};

// Create a new instance
const roast = new ConsoleRoast(config);

console.log('Starting TypeScript roast-log example...');

// Test different types of content with TypeScript
console.log('Hello from TypeScript!');
console.log('User object:', { id: 1, name: 'Alice', active: true });
console.log('Mixed types:', 'string', 123, true, null, undefined);

// Test complex objects
const complexData = {
  users: [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ],
  metadata: {
    total: 2,
    page: 1,
    hasMore: false
  }
};
console.log('Complex data:', complexData);

// Test error scenarios
console.log('TypeError: Cannot read property of undefined');
console.log('Network error: Connection timeout');

// Test success scenarios
console.log('API call successful');
console.log('Data saved successfully');

// Demonstrate configuration changes
setTimeout(() => {
  console.log('\nChanging humor level to mild...');
  roast.configure({ humorLevel: 'mild' });
  
  console.log('This should have milder humor');
  console.log('Testing with new configuration');
}, 1000);

// Show metrics and cleanup
setTimeout(() => {
  console.log('\n=== Final Report ===');
  console.log('Status:', roast.getStatus());
  console.log('Metrics:', roast.getMetrics());
  
  // Test disable/enable
  console.log('\nDisabling roast-log...');
  roast.disable();
  console.log('This log should be normal');
  
  console.log('Re-enabling roast-log...');
  roast.enable();
  console.log('This log should have humor again');
  
  // Final cleanup
  setTimeout(() => {
    roast.cleanup();
    console.log('Example completed and cleaned up!');
  }, 500);
}, 2000);