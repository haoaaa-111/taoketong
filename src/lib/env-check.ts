/**
 * Environment variable validation utils
 */

// Flag to track LLM availability
let _llm_available: boolean | null = null;

/**
 * Validate required environment variables
 * @returns Object with validation result and any errors
 */
export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required LLM API key
  if (!process.env.LLM_API_KEY || process.env.LLM_API_KEY.trim() === '') {
    errors.push('LLM_API_KEY is missing or empty. LLM functionality will be disabled.');
  } else {
    // Mark as potentially available (will be confirmed during actual use)
    _llm_available = true;
  }

  // Check for optional LLM base URL
  if (!process.env.LLM_BASE_URL || process.env.LLM_BASE_URL.trim() === '') {
    warnings.push('LLM_BASE_URL is not set, may use default provider endpoint');
  }

  if (errors.length > 0) {
    _llm_available = false;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get LLM availability flag after validation
 * @returns boolean indicating if LLM is available
 */
export function getLlmAvailability(): boolean {
  if (_llm_available === null) {
    // If not set yet, check if we have the key
    const envResult = validateEnv();
    return envResult.valid;
  }
  return _llm_available;
}

/**
 * Lightweight test of LLM availability
 * @param customApiKey Optional API key to test with
 * @param customBaseUrl Optional base URL to test with
 * @returns Promise<boolean> whether LLM service is reachable
 */
export async function testLlmConnection(customApiKey?: string, customBaseUrl?: string): Promise<boolean> {
  try {
    const apiKey = customApiKey || process.env.LLM_API_KEY;
    const baseUrl = customBaseUrl || process.env.LLM_BASE_URL;

    if (!apiKey) {
      return false;
    }

    // Use a lightweight test based on environment
    if (baseUrl?.includes('openai')) {
      // Test OpenAI-style endpoint
      const testEndpoint = `${baseUrl}/models`;
      const response = await fetch(testEndpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } else if (baseUrl?.includes('gemini')) {
      // Test Gemini-style endpoint
      const testEndpoint = `${baseUrl.replace(/\/v\d+.*/, '')}/v1/projects/-/locations/global/models`;
      const response = await fetch(testEndpoint);
      return response.ok;
    } else {
      // For other providers, do a basic validation check
      // Just confirm the variables exist and aren't empty
      const result = validateEnv();
      return result.valid;
    }
  } catch (error) {
    console.warn('LLM connection test failed:', error);
    return false;
  }
}