import { NextResponse } from 'next/server';
import { createCallsSession, getCloudflareCallsConfig } from '@/lib/cloudflareCalls';

export async function GET() {
  const { isConfigured } = getCloudflareCallsConfig();
  return NextResponse.json({ isConfigured });
}

export async function POST() {
  try {
    const { isConfigured } = getCloudflareCallsConfig();
    if (!isConfigured) {
      return NextResponse.json(
        {
          error: 'CONFIG_REQUIRED',
          message: 'Cloudflare Calls is not configured. Please set CLOUDFLARE_CALLS_APP_ID and CLOUDFLARE_CALLS_APP_SECRET in .env.local',
        },
        { status: 503 }
      );
    }

    const session = await createCallsSession();
    return NextResponse.json(session);
  } catch (error: unknown) {
    console.error('Error creating Cloudflare Calls session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'CALLS_SESSION_FAILED', message }, { status: 500 });
  }
}
