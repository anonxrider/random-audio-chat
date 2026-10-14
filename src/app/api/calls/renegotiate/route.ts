import { NextResponse } from 'next/server';
import { renegotiateCallsSession } from '@/lib/cloudflareCalls';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, sessionDescription } = body;

    if (!sessionId || !sessionDescription) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'sessionId and sessionDescription are required' },
        { status: 400 }
      );
    }

    const response = await renegotiateCallsSession(sessionId, sessionDescription);
    return NextResponse.json(response ?? { success: true });
  } catch (error: unknown) {
    console.error('Error renegotiating Cloudflare Calls session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'CALLS_RENEGOTIATE_FAILED', message }, { status: 500 });
  }
}
