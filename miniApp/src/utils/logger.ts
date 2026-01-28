// Production-safe logger - only logs in development
const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  }
};

