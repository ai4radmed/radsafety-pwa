// Test environment setup
// Mock import.meta.env for Astro environment variables

// Enable all log levels in tests
(import.meta as any).env = { ...(import.meta as any).env, PUBLIC_LOG_LEVEL: 'info' };
