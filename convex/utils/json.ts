export function safeParseJson<T>(raw: string, fallback: T, schemaHint?: any): T {
  try {
    const parsed = JSON.parse(raw);
    if (schemaHint) {
      // Basic schema check: ensure all required keys exist and types match approximately
      for (const [key, expectedType] of Object.entries(schemaHint)) {
        if (typeof parsed[key] !== expectedType) {
          console.error(`JSON schema mismatch for ${key}: expected ${expectedType}, got ${typeof parsed[key]}`);
          return fallback;
        }
      }
    }
    return parsed;
  } catch (error) {
    console.error(`JSON parse error: ${(error as Error).message}`);
    return fallback;
  }
}