/**
 * roast-log - A Node.js library that enhances console.log with humorous comments
 * 
 * This is the main entry point for the library.
 */

// Export all types for consumers
export * from '../types';

// Export configuration manager
export { ConfigurationManager, EnvConfig } from './config';

// Export Anthropic client
export { AnthropicClient } from './anthropic';

// Main ConsoleRoast class will be implemented in later tasks
export class ConsoleRoast {
  // Implementation will be added in task 9
}

// Default export for easy importing
export default ConsoleRoast;