import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();

    if (!keyId || !apiToken) {
      return NextResponse.json(
        { error: 'Missing Cloudflare TURN credentials in .env.local' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }), // 24 hours validity
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to generate Cloudflare TURN credentials:', errText);
      return NextResponse.json(
        { error: `Cloudflare TURN API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Cloudflare returns { iceServers: { urls: [...], username: "...", credential: "..." } }
    const iceServers = Array.isArray(data.iceServers)
      ? data.iceServers
      : [data.iceServers];

    return NextResponse.json({ iceServers });
  } catch (error: unknown) {
    console.error('Error generating Cloudflare TURN credentials:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
