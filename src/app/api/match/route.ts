import { NextResponse } from 'next/server';

// Global variable for in-memory queue.
// In a real production deployment (e.g. Vercel), this should be replaced with a Redis queue (like Upstash).
const globalQueue = globalThis as unknown as { waitingPeerId: string | null };
if (typeof globalQueue.waitingPeerId === 'undefined') {
  globalQueue.waitingPeerId = null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { peerId } = body;

    if (!peerId) {
      return NextResponse.json({ error: 'PeerID is required' }, { status: 400 });
    }

    if (globalQueue.waitingPeerId && globalQueue.waitingPeerId !== peerId) {
      // We have a match!
      const match = globalQueue.waitingPeerId;
      globalQueue.waitingPeerId = null; // Clear the queue
      return NextResponse.json({ match });
    } else {
      // No one is waiting, so this user becomes the waiter
      globalQueue.waitingPeerId = peerId;
      return NextResponse.json({ status: 'waiting' });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { peerId } = body;
    if (globalQueue.waitingPeerId === peerId) {
      globalQueue.waitingPeerId = null;
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
