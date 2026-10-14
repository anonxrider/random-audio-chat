import { NextResponse } from 'next/server';
import { publishLocalTracks } from '@/lib/cloudflareCalls';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, sessionDescription, tracks } = body;

    if (!sessionId || !sessionDescription || !tracks) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'sessionId, sessionDescription, and tracks are required' },
        { status: 400 }
      );
    }

    const response = await publishLocalTracks(sessionId, sessionDescription, tracks);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error publishing tracks to Cloudflare Calls:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'CALLS_PUBLISH_FAILED', message }, { status: 500 });
  }
}
