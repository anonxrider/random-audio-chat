import { NextResponse } from 'next/server';

interface RoomStore {
  rooms: Record<string, Array<{ id: string; updatedAt: number }>>;
  roomMeta: Record<string, { hostId?: string; isLocked?: boolean }>;
  admittedPeers: Record<string, Array<string>>;
  randomQueue: Array<{ id: string; updatedAt: number }>;
  matches: Record<string, string>; // userId -> partnerId
}

const globalStore = globalThis as unknown as { __cf_chat_rooms__?: RoomStore };
if (!globalStore.__cf_chat_rooms__) {
  globalStore.__cf_chat_rooms__ = {
    rooms: {},
    roomMeta: {},
    admittedPeers: {},
    randomQueue: [],
    matches: {},
  };
}

const store = globalStore.__cf_chat_rooms__;
if (!store.roomMeta) {
  store.roomMeta = {};
}
if (!store.admittedPeers) {
  store.admittedPeers = {};
}

function cleanStaleSessions() {
  const now = Date.now();
  const STALE_TIMEOUT_MS = 45000;

  // Clean random queue
  store.randomQueue = store.randomQueue.filter(entry => now - entry.updatedAt < STALE_TIMEOUT_MS);

  // Clean custom rooms
  for (const roomId of Object.keys(store.rooms)) {
    store.rooms[roomId] = store.rooms[roomId].filter(entry => now - entry.updatedAt < STALE_TIMEOUT_MS);
    if (store.rooms[roomId].length === 0) {
      delete store.rooms[roomId];
      delete store.roomMeta[roomId];
      delete store.admittedPeers[roomId];
    }
  }
}

export async function GET(req: Request) {
  cleanStaleSessions();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('peerId') || searchParams.get('sessionId');
  const roomId = searchParams.get('roomId') || 'random';

  if (!id) {
    return NextResponse.json({ error: 'peerId is required' }, { status: 400 });
  }

  // Check if paired in random chat
  if (roomId === 'random') {
    if (store.matches[id]) {
      const partnerId = store.matches[id];
      delete store.matches[id];
      return NextResponse.json({ status: 'connected', matchedId: partnerId, peers: [partnerId] });
    }

    // Refresh heartbeat in queue
    const queued = store.randomQueue.find(e => e.id === id);
    if (queued) {
      queued.updatedAt = Date.now();
    }
    return NextResponse.json({ status: 'waiting', peers: [] });
  }

  // For custom rooms, return list of other members
  if (!store.rooms[roomId]) {
    store.rooms[roomId] = [];
  }
  
  const existing = store.rooms[roomId].find(e => e.id === id);
  if (existing) {
    existing.updatedAt = Date.now();
  }

  const otherPeers = store.rooms[roomId]
    .filter(e => e.id !== id)
    .map(e => e.id);

  const meta = store.roomMeta[roomId] || {};
  return NextResponse.json({
    peers: otherPeers,
    isLocked: Boolean(meta.isLocked),
    hostId: meta.hostId || null,
  });
}

export async function POST(req: Request) {
  try {
    cleanStaleSessions();
    const body = await req.json();
    const id = body.peerId || body.sessionId;
    const roomId = body.roomId || 'random';

    if (!id) {
      return NextResponse.json({ error: 'peerId is required' }, { status: 400 });
    }

    // Handle random 1-on-1 matchmaking
    if (roomId === 'random') {
      store.randomQueue = store.randomQueue.filter(entry => entry.id !== id);
      delete store.matches[id];

      if (store.randomQueue.length > 0) {
        // Pop the first waiting peer and pair them
        const matched = store.randomQueue.shift();
        if (matched && matched.id !== id) {
          store.matches[matched.id] = id;
          return NextResponse.json({
            status: 'connected',
            matchedId: matched.id,
            peers: [matched.id],
          });
        }
      }

      // No partner waiting, enter the queue
      store.randomQueue.push({ id, updatedAt: Date.now() });
      return NextResponse.json({ status: 'waiting', peers: [] });
    }

    // Handle specific group rooms
    if (!store.rooms[roomId]) {
      store.rooms[roomId] = [];
    }

    // Set host if room is newly created or empty (Default to requiring host approval!)
    if (!store.roomMeta[roomId] || !store.roomMeta[roomId].hostId || store.rooms[roomId].length === 0) {
      store.roomMeta[roomId] = { hostId: id, isLocked: true };
    }

    const meta = store.roomMeta[roomId] || {};
    const isHost = meta.hostId === id;
    const isAlreadyInRoom = store.rooms[roomId].some(entry => entry.id === id);
    const isAdmitted = store.admittedPeers?.[roomId]?.includes(id);

    // If room requires host approval and this peer is NOT the host and not admitted:
    if (meta.isLocked && !isHost && !isAlreadyInRoom && !isAdmitted) {
      return NextResponse.json({
        locked: true,
        hostId: meta.hostId,
        peers: [],
      });
    }

    const existingPeers = store.rooms[roomId]
      .filter(entry => entry.id !== id)
      .map(entry => entry.id);

    // Register peer in room
    const current = store.rooms[roomId].find(entry => entry.id === id);
    if (current) {
      current.updatedAt = Date.now();
    } else {
      store.rooms[roomId].push({ id, updatedAt: Date.now() });
    }

    return NextResponse.json({
      peers: existingPeers,
      isHost,
      isLocked: Boolean(meta.isLocked),
      hostId: meta.hostId,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { roomId, isLocked, hostId, admitPeerId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    if (!store.roomMeta[roomId]) {
      store.roomMeta[roomId] = {};
    }

    if (typeof isLocked === 'boolean') {
      store.roomMeta[roomId].isLocked = isLocked;
    }
    if (hostId) {
      store.roomMeta[roomId].hostId = hostId;
    }

    if (admitPeerId) {
      if (!store.admittedPeers) store.admittedPeers = {};
      if (!store.admittedPeers[roomId]) store.admittedPeers[roomId] = [];
      if (!store.admittedPeers[roomId].includes(admitPeerId)) {
        store.admittedPeers[roomId].push(admitPeerId);
      }
    }

    return NextResponse.json({ success: true, meta: store.roomMeta[roomId] });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = body.peerId || body.sessionId;
    const roomId = body.roomId;

    // Host ends room for all participants
    if (body.endRoomForAll && roomId) {
      delete store.rooms[roomId];
      delete store.roomMeta[roomId];
      delete store.admittedPeers[roomId];
      return NextResponse.json({ success: true, ended: true });
    }

    // Host kicks specific participant
    if (body.kickPeerId && roomId && store.rooms[roomId]) {
      store.rooms[roomId] = store.rooms[roomId].filter(entry => entry.id !== body.kickPeerId);
      if (store.admittedPeers?.[roomId]) {
        store.admittedPeers[roomId] = store.admittedPeers[roomId].filter(p => p !== body.kickPeerId);
      }
      return NextResponse.json({ success: true, kicked: body.kickPeerId });
    }

    if (!id) {
      return NextResponse.json({ error: 'peerId is required' }, { status: 400 });
    }

    store.randomQueue = store.randomQueue.filter(entry => entry.id !== id);
    delete store.matches[id];

    if (roomId && store.rooms[roomId]) {
      store.rooms[roomId] = store.rooms[roomId].filter(entry => entry.id !== id);
      if (store.rooms[roomId].length === 0) {
        delete store.rooms[roomId];
        delete store.roomMeta[roomId];
        delete store.admittedPeers[roomId];
      }
    } else {
      for (const key of Object.keys(store.rooms)) {
        store.rooms[key] = store.rooms[key].filter(entry => entry.id !== id);
        if (store.rooms[key].length === 0) {
          delete store.rooms[key];
          delete store.roomMeta[key];
          delete store.admittedPeers[key];
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
