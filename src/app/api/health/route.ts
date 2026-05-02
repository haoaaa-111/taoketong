import { NextResponse } from 'next/server';
import { pingDB } from '@/db';
import { getLlmAvailability } from '@/lib/env-check';

export async function GET() {
  const results: {
    status: 'ok' | 'degraded' | 'error';
    db: 'ok' | 'error';
    llm: 'ok' | 'unavailable';
    details: string[];
  } = {
    status: 'ok',
    db: 'ok',
    llm: 'ok',
    details: [],
  };

  // Check DB connectivity with SELECT 1 query
  try {
    const dbOk = await pingDB();
    if (dbOk) {
      results.db = 'ok';
      results.details.push('Database connectivity: OK');
    } else {
      results.db = 'error';
      results.status = 'error';
      results.details.push('Database connectivity: FAILED');
    }
  } catch (error) {
    results.db = 'error';
    results.status = 'error';
    results.details.push(`Database connectivity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check LLM availability
  try {
    const llmAvailable = getLlmAvailability();
    if (llmAvailable) {
      results.llm = 'ok';
      results.details.push('LLM service: Available');
    } else {
      results.llm = 'unavailable';
      // If LLM unavailable but everything else is OK, mark as degraded
      if (results.status === 'ok') {
        results.status = 'degraded';
      }
      results.details.push('LLM service: Unavailable');
    }
  } catch (error) {
    results.llm = 'unavailable';
    if (results.status === 'ok') {
      results.status = 'degraded';
    }
    results.details.push(`LLM service check: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return NextResponse.json(results);
}
