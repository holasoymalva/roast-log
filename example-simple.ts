/**
 * Simplest possible example - just import and use
 */

import ConsoleRoast from './src/index';

// One-liner setup with defaults
const roast = new ConsoleRoast();

// Now all console.log calls will be enhanced with humor
console.log('Hello, world!');
console.log('This is a simple example');
console.log('Error: Something went wrong');
console.log('Success: Everything is working');

// That's it! The library handles everything automatically
setTimeout(() => {
  roast.cleanup();
}, 1000);