import { NextResponse } from 'next/server';
import { subscribeRemoteTracks } from '@/lib/cloudflareCalls';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, tracks } = body;

    if (!sessionId || !tracks || !Array.isArray(tracks)) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'sessionId and tracks array are required' },
        { status: 400 }
      );
    }

    const response = await subscribeRemoteTracks(sessionId, tracks);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error subscribing to remote tracks on Cloudflare Calls:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'CALLS_SUBSCRIBE_FAILED', message }, { status: 500 });
  }
}
