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
 * POST /api/memories - Add a memory to Mem0
 * Body: { content: string, userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, userId = 'studio-user' } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const response = await fetch(`${MEM0_API_BASE}/v1/memories/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        user_id: userId,
        messages: [{ role: 'user', content: content.trim() }],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || 'Failed to add memory', details: data?.details },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add memory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
