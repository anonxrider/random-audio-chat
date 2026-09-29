import { NextResponse } from 'next/server';

// Global variable for in-memory queue/rooms.
// rooms map RoomID to an array of PeerIDs
const globalQueue = globalThis as unknown as { rooms: Record<string, string[]> };
if (!globalQueue.rooms) {
  globalQueue.rooms = {};
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { peerId, roomId = 'random' } = body;

    if (!peerId) {
      return NextResponse.json({ error: 'PeerID is required' }, { status: 400 });
    }

    if (!globalQueue.rooms[roomId]) {
      globalQueue.rooms[roomId] = [];
    }

    // If it's a random room and someone is waiting (for 1-to-1), we match and remove them
    // Actually, to make 'random' faster and 1-to-1, we pop the queue.
    if (roomId === 'random') {
      if (globalQueue.rooms['random'].length > 0 && !globalQueue.rooms['random'].includes(peerId)) {
        const match = globalQueue.rooms['random'].shift(); // take the first waiting
        return NextResponse.json({ peers: match ? [match] : [] });
      } else {
        if (!globalQueue.rooms['random'].includes(peerId)) {
          globalQueue.rooms['random'].push(peerId);
        }
        return NextResponse.json({ status: 'waiting', peers: [] });
      }
    }

    // For specific rooms, it's a GROUP room. Return all existing peers.
    const existingPeers = globalQueue.rooms[roomId].filter(id => id !== peerId);
    
    // Add ourselves to the room
    if (!globalQueue.rooms[roomId].includes(peerId)) {
      globalQueue.rooms[roomId].push(peerId);
    }

    return NextResponse.json({ peers: existingPeers });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { peerId, roomId } = body;
    
    if (roomId && globalQueue.rooms[roomId]) {
       globalQueue.rooms[roomId] = globalQueue.rooms[roomId].filter(id => id !== peerId);
       if (globalQueue.rooms[roomId].length === 0) {
         delete globalQueue.rooms[roomId];
       }
    } else {
      // Fallback: remove from all rooms
      for (const [key, peers] of Object.entries(globalQueue.rooms)) {
        globalQueue.rooms[key] = peers.filter(id => id !== peerId);
        if (globalQueue.rooms[key].length === 0) {
          delete globalQueue.rooms[key];
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
