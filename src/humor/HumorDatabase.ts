import { HumorEntry, ContentAnalysis, IHumorDatabase } from '../../types';

/**
 * Local humor database that provides fallback humor when API is unavailable
 * and serves as a source for contextually appropriate humorous responses
 */
export class HumorDatabase implements IHumorDatabase {
  private humorEntries: HumorEntry[] = [];

  constructor() {
    this.initializeDefaultHumor();
  }

  /**
   * Get humor entries that match the content analysis and humor level
   */
  getHumor(analysis: ContentAnalysis, humorLevel: string): HumorEntry[] {
    return this.humorEntries.filter(entry => {
      // Filter by humor level
      if (entry.humorLevel !== humorLevel) {
        return false;
      }

      // Check if any triggers match the analysis
      const matchesTriggers = entry.triggers.some(trigger => {
        // Check against data types
        if (analysis.dataTypes.some(type => type.toLowerCase().includes(trigger.toLowerCase()))) {
          return true;
        }
        
        // Check against patterns
        if (analysis.patterns.some(pattern => pattern.toLowerCase().includes(trigger.toLowerCase()))) {
          return true;
        }
        
        // Check against sanitized content
        if (analysis.sanitizedContent.toLowerCase().includes(trigger.toLowerCase())) {
          return true;
        }

        return false;
      });

      // Check category-specific matches
      const matchesCategory = this.matchesCategory(entry, analysis);

      return matchesTriggers || matchesCategory;
    });
  }

  /**
   * Add a new humor entry to the database
   */
  addHumor(entry: HumorEntry): void {
    this.humorEntries.push(entry);
  }

  /**
   * Get a random humor response from a specific category and humor level
   */
  getRandomHumor(category: string, humorLevel: string): string | null {
    const matchingEntries = this.humorEntries.filter(
      entry => entry.category === category && entry.humorLevel === humorLevel
    );

    if (matchingEntries.length === 0) {
      return null;
    }

    const randomEntry = matchingEntries[Math.floor(Math.random() * matchingEntries.length)];
    const randomResponse = randomEntry.responses[Math.floor(Math.random() * randomEntry.responses.length)];
    
    return randomResponse;
  }

  /**
   * Check if a humor entry matches the analysis category
   */
  private matchesCategory(entry: HumorEntry, analysis: ContentAnalysis): boolean {
    switch (entry.category) {
      case 'error':
        return analysis.isError || analysis.sentiment === 'negative';
      case 'success':
        return analysis.sentiment === 'positive';
      case 'data':
        return analysis.dataTypes.length > 0;
      case 'general':
        return true; // General humor can match anything
      default:
        return false;
    }
  }

  /**
   * Initialize the database with default humor entries
   */
  private initializeDefaultHumor(): void {
    // Error category humor
    this.addErrorHumor();
    
    // Success category humor
    this.addSuccessHumor();
    
    // Data category humor
    this.addDataHumor();
    
    // General category humor
    this.addGeneralHumor();
  }

  /**
   * Add error-related humor entries
   */
  private addErrorHumor(): void {
    // Mild error humor
    this.addHumor({
      triggers: ['error', 'exception', 'fail', 'undefined', 'null'],
      responses: [
        "Oops! Looks like something went sideways 🤔",
        "Well, that didn't go as planned...",
        "Houston, we have a problem (but it's probably fixable)",
        "Error detected! Time for some detective work 🕵️",
        "Something's not quite right here..."
      ],
      humorLevel: 'mild',
      category: 'error'
    });

    // Medium error humor
    this.addHumor({
      triggers: ['error', 'exception', 'fail', 'undefined', 'null'],
      responses: [
        "Congratulations! You've discovered a new way to break things 🎉",
        "Error: Task failed successfully... wait, that's not right",
        "Your code is having an existential crisis right now",
        "Plot twist: The bug was inside us all along",
        "Error 404: Logic not found"
      ],
      humorLevel: 'medium',
      category: 'error'
    });

    // Savage error humor
    this.addHumor({
      triggers: ['error', 'exception', 'fail', 'undefined', 'null'],
      responses: [
        "Your code just rage-quit harder than a gamer losing at Dark Souls",
        "This error is so bad, even Stack Overflow is judging you",
        "Congratulations! You've achieved peak chaos engineering",
        "Your code is throwing more tantrums than a toddler at bedtime",
        "This error message is basically your code's resignation letter"
      ],
      humorLevel: 'savage',
      category: 'error'
    });
  }

  /**
   * Add success-related humor entries
   */
  private addSuccessHumor(): void {
    // Mild success humor
    this.addHumor({
      triggers: ['success', 'complete', 'done', 'finished', 'ok'],
      responses: [
        "Nice work! Everything's running smoothly ✨",
        "Success! Your code is behaving like a good citizen",
        "Well done! No fires to put out here",
        "Looking good! Keep up the great work",
        "Success achieved! Time for a coffee break ☕"
      ],
      humorLevel: 'mild',
      category: 'success'
    });

    // Medium success humor
    this.addHumor({
      triggers: ['success', 'complete', 'done', 'finished', 'ok'],
      responses: [
        "Success! Your code is showing off like it's at a talent show",
        "Mission accomplished! Your code deserves a gold star ⭐",
        "Victory! Your logic is sharper than a ninja's blade",
        "Success! Even the rubber duck is impressed",
        "Boom! Your code just dropped the mic 🎤"
      ],
      humorLevel: 'medium',
      category: 'success'
    });

    // Savage success humor
    this.addHumor({
      triggers: ['success', 'complete', 'done', 'finished', 'ok'],
      responses: [
        "Success! Your code is flexing harder than a bodybuilder at the beach",
        "Flawless victory! Your code just achieved legendary status",
        "Success! Your algorithm is smoother than a jazz saxophone solo",
        "Perfect execution! Your code is basically showing off at this point",
        "Success! Your logic is so clean, Marie Kondo would be proud"
      ],
      humorLevel: 'savage',
      category: 'success'
    });
  }

  /**
   * Add data-type related humor entries
   */
  private addDataHumor(): void {
    // Mild data humor
    this.addHumor({
      triggers: ['object', 'array', 'string', 'number', 'boolean'],
      responses: [
        "Interesting data you've got there! 📊",
        "Data logged successfully - looking good!",
        "Your variables are all accounted for",
        "Data structure detected and noted",
        "Information received and processed ✓"
      ],
      humorLevel: 'mild',
      category: 'data'
    });

    // Medium data humor
    this.addHumor({
      triggers: ['object', 'array', 'string', 'number', 'boolean'],
      responses: [
        "Your data is more organized than my sock drawer",
        "Data logged! Your variables are living their best life",
        "Nice data structure! It's like digital feng shui",
        "Your objects are more well-behaved than most people",
        "Data received! Your arrays are lining up like good soldiers"
      ],
      humorLevel: 'medium',
      category: 'data'
    });

    // Savage data humor
    this.addHumor({
      triggers: ['object', 'array', 'string', 'number', 'boolean'],
      responses: [
        "Your data structure is so clean, it makes minimalists weep with joy",
        "This data is more organized than a German train schedule",
        "Your objects have better structure than most architectural marvels",
        "Data logged! Your variables are more reliable than most politicians",
        "Your arrays are so well-ordered, they could teach a masterclass in discipline"
      ],
      humorLevel: 'savage',
      category: 'data'
    });
  }

  /**
   * Add general humor entries
   */
  private addGeneralHumor(): void {
    // Mild general humor
    this.addHumor({
      triggers: ['log', 'debug', 'info', 'console'],
      responses: [
        "Another day, another log entry 📝",
        "Logging in progress... carry on!",
        "Debug mode activated - happy coding!",
        "Console.log: the developer's best friend",
        "Keeping track of things, one log at a time"
      ],
      humorLevel: 'mild',
      category: 'general'
    });

    // Medium general humor
    this.addHumor({
      triggers: ['log', 'debug', 'info', 'console'],
      responses: [
        "Console.log: because printf debugging never goes out of style",
        "Another log entry for the digital archaeology team",
        "Debugging: the art of removing bugs you put in yesterday",
        "Console.log: turning developers into digital detectives since forever",
        "Your console is chattier than a coffee shop on Monday morning"
      ],
      humorLevel: 'medium',
      category: 'general'
    });

    // Savage general humor
    this.addHumor({
      triggers: ['log', 'debug', 'info', 'console'],
      responses: [
        "Console.log: because real debuggers are for people who plan ahead",
        "Another log entry in the epic saga of 'Why Doesn't This Work?'",
        "Debugging: the fine art of staring at code until it confesses",
        "Your console has more drama than a reality TV show",
        "Console.log: the developer's equivalent of talking to themselves"
      ],
      humorLevel: 'savage',
      category: 'general'
    });
  }
}