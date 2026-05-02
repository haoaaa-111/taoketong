/**
 * Safely parses JSON string with fallback support
 * @param raw - Raw JSON string to parse, or null/undefined
 * @param fallback - Value to return if parsing fails
 * @returns Parsed JSON object/array/value or fallback
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;

  try {
    // Don't return fallback for empty string, as JSON.parse("") would actually throw
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`, { raw });
    return fallback;
  }
}