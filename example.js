/**
 * Simple example demonstrating roast-log usage
 */

const ConsoleRoast = require('./dist/index.js').default;

// Create a new instance with custom configuration
const roast = new ConsoleRoast({
  humorLevel: 'medium',
  frequency: 100, // Apply humor to all logs
  enabled: true,
  fallbackToLocal: true
});

console.log('Starting roast-log example...');

// Test different types of content
console.log('Hello, world!');
console.log('User data:', { name: 'John', age: 30 });
console.log('Numbers:', 42, 3.14, 100);
console.log('Array:', [1, 2, 3, 'test']);

// Test error scenarios
console.log('Error: Something went wrong!');
console.log('Failed to connect to database');

// Test success scenarios
console.log('Success: Operation completed successfully');
console.log('Connection established');

// Wait a bit for async humor generation
setTimeout(() => {
  console.log('\nExample completed!');
  console.log('Status:', roast.getStatus());
  console.log('Metrics:', roast.getMetrics());
  
  // Cleanup
  roast.cleanup();
  console.log('Roast-log disabled. Back to normal logging.');
}, 2000);