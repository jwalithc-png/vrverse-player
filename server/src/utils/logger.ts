/**
 * VRVerse Player — Logger Utility
 * Color-coded console logging with timestamps.
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(`${colors.gray}[${timestamp()}]${colors.cyan} [INFO]${colors.reset} ${message}`, ...args);
  },

  success(message: string, ...args: unknown[]): void {
    console.log(`${colors.gray}[${timestamp()}]${colors.green} [OK]${colors.reset} ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${colors.gray}[${timestamp()}]${colors.yellow} [WARN]${colors.reset} ${message}`, ...args);
  },

  error(message: string, ...args: unknown[]): void {
    console.error(`${colors.gray}[${timestamp()}]${colors.red} [ERROR]${colors.reset} ${message}`, ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${colors.gray}[${timestamp()}] [DEBUG]${colors.reset} ${message}`, ...args);
    }
  },

  pipeline(stage: string, message: string): void {
    console.log(`${colors.gray}[${timestamp()}]${colors.magenta} [PIPELINE:${stage}]${colors.reset} ${message}`);
  },
};
