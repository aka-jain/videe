import { NextRequest, NextResponse } from 'next/server';

const MEM0_API_BASE = 'https://api.mem0.ai';

function getAuthHeader(): string {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    throw new Error('MEM0_API_KEY is not set');
  }
  return `Token ${apiKey}`;
}

/**
 * POST /api/memories/search - Search memories in Mem0
 * Body: { query: string, userId?: string, topK?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId = 'studio-user', topK = 10 } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const response = await fetch(`${MEM0_API_BASE}/v2/memories/search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        query: query.trim(),
        filters: { user_id: userId },
        top_k: Math.min(Math.max(1, Number(topK) || 10), 50),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || 'Failed to search memories', details: data?.details },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search memories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
