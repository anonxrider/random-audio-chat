import { NextResponse } from 'next/server';

// Global variable for in-memory queue.
// In a real production deployment, this should be replaced with a Redis queue.
const globalQueue = globalThis as unknown as { rooms: Record<string, string> };
if (!globalQueue.rooms) {
  globalQueue.rooms = {};
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { peerId, roomId = 'random' } = body; // default to 'random' queue

    if (!peerId) {
      return NextResponse.json({ error: 'PeerID is required' }, { status: 400 });
    }

    const waitingPeer = globalQueue.rooms[roomId];

    if (waitingPeer && waitingPeer !== peerId) {
      // We have a match in this room!
      const match = waitingPeer;
      delete globalQueue.rooms[roomId]; // Clear the room/queue
      return NextResponse.json({ match });
    } else {
      // No one is waiting in this room, so this user becomes the waiter
      globalQueue.rooms[roomId] = peerId;
      return NextResponse.json({ status: 'waiting' });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { peerId, roomId = 'random' } = body;
    
    if (globalQueue.rooms[roomId] === peerId) {
      delete globalQueue.rooms[roomId];
    }
    
    // Fallback: search across all rooms just in case
    for (const [key, value] of Object.entries(globalQueue.rooms)) {
      if (value === peerId) {
        delete globalQueue.rooms[key];
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
