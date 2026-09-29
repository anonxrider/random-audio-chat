"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import type { Peer, MediaConnection } from "peerjs";
import { useSearchParams, useRouter } from "next/navigation";

function VideoPlayer({ stream, label, isLocal, muted, onMuteToggle }: { stream: MediaStream | null; label: string; isLocal?: boolean; muted?: boolean; onMuteToggle?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-wrapper">
      <span className="video-label">{label}</span>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted={isLocal ? true : muted} 
        className={`video-player ${isLocal ? 'mirror' : ''}`} 
      />
      {onMuteToggle && !isLocal && (
        <button className="mute-btn" onClick={onMuteToggle}>
          {muted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
      )}
    </div>
  );
}

function ChatApp() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [status, setStatus] = useState<"idle" | "finding" | "connected">("idle");
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [mutedPeers, setMutedPeers] = useState<Record<string, boolean>>({});
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomIdFromUrl = searchParams.get('room');
  
  const [roomInput, setRoomInput] = useState<string>(roomIdFromUrl || '');
  const [activeRoom, setActiveRoom] = useState<string>(roomIdFromUrl || 'random');
  const [shareLink, setShareLink] = useState<string>('');
  
  const callsRef = useRef<Record<string, MediaConnection>>({});
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (roomIdFromUrl && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/?room=${roomIdFromUrl}`);
    }
  }, [roomIdFromUrl]);

  useEffect(() => {
    import("peerjs").then(({ default: Peer }) => {
      const newPeer = new Peer();
      newPeer.on("open", (id) => {
        console.log("My peer ID is: " + id);
      });
      
      newPeer.on("call", (call) => {
        console.log("Incoming call from: " + call.peer);
        // Answer automatically if we have our stream ready
        setMyStream((currentStream) => {
           if (currentStream) {
             call.answer(currentStream);
             handleIncomingCall(call);
             setStatus("connected");
           }
           return currentStream;
        });
      });

      setPeer(newPeer);
      peerRef.current = newPeer;
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      stopAllMedia();
    };
  }, []);

  const handleIncomingCall = (call: MediaConnection) => {
    callsRef.current[call.peer] = call;
    
    call.on("stream", (remoteStream) => {
      setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
    });

    call.on("close", () => {
      removePeer(call.peer);
    });
    call.on("error", () => {
      removePeer(call.peer);
    });
  };

  const removePeer = (peerId: string) => {
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    if (callsRef.current[peerId]) {
      callsRef.current[peerId].close();
      delete callsRef.current[peerId];
    }
    // If it's a random 1-on-1 and they left, disconnect fully
    if (activeRoom === 'random') {
       handleDisconnect(true); // stay in finding mode
       startFinding('random');
    }
  };

  const stopAllMedia = () => {
    setMyStream((current) => {
      if (current) {
        current.getTracks().forEach(track => track.stop());
      }
      return null;
    });
  };

  const handleDisconnect = (keepStream = false) => {
    setStatus(keepStream ? "finding" : "idle");
    
    Object.values(callsRef.current).forEach(call => call.close());
    callsRef.current = {};
    setRemoteStreams({});
    setMutedPeers({});
    
    if (!keepStream) {
      stopAllMedia();
    }
  };

  const stopCall = async () => {
    handleDisconnect(false);
    
    if (peerRef.current) {
      await fetch('/api/match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peerRef.current.id, roomId: activeRoom }),
      });
    }
  };

  const startFinding = async (targetRoom = 'random') => {
    if (!peer || !peer.id) return;
    
    setStatus("finding");
    setActiveRoom(targetRoom);

    let stream = myStream;
    if (!stream) {
      try {
        // Optimize for speed and smoothness in group calls
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 480, height: 360, frameRate: 24 }, 
          audio: true 
        });
        setMyStream(stream);
      } catch (err) {
        console.error("Failed to get local stream", err);
        setStatus("idle");
        alert("Please allow camera and microphone access to chat.");
        return;
      }
    }

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peer.id, roomId: targetRoom }),
      });
      const data = await res.json();

      if (data.peers && data.peers.length > 0) {
        console.log("Found peers! Calling: ", data.peers);
        setStatus("connected");
        
        // Call all existing peers in the room
        data.peers.forEach((remotePeerId: string) => {
          if (!stream) return;
          const call = peer.call(remotePeerId, stream);
          handleIncomingCall(call);
        });
      } else {
        console.log("Waiting in queue...");
      }
    } catch (error) {
      console.error("Matchmaking error:", error);
      setStatus("idle");
    }
  };

  const toggleLocalMute = () => {
    if (myStream) {
      const audioTracks = myStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsLocalMuted(!audioTracks[0].enabled);
      }
    }
  };

  const togglePeerMute = (peerId: string) => {
    setMutedPeers(prev => ({
      ...prev,
      [peerId]: !prev[peerId]
    }));
  };

  const generateRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomInput(newRoom);
    setShareLink(`${window.location.origin}/?room=${newRoom}`);
    router.push(`/?room=${newRoom}`);
  };

  const joinSpecificRoom = () => {
    if (!roomInput) return alert("Please enter a room code");
    setShareLink(`${window.location.origin}/?room=${roomInput.toUpperCase()}`);
    router.push(`/?room=${roomInput.toUpperCase()}`);
    startFinding(roomInput.toUpperCase());
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Room link copied to clipboard!');
  };

  const hasPeers = Object.keys(remoteStreams).length > 0;

  return (
    <>
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      
      <main className="container">
        <div className="glass-card" style={{ maxWidth: '1000px', width: '100%' }}>
          <h1>VibeChat</h1>
          <p>Connect randomly or create a group room to chat with multiple people.</p>

          <div className="status-badge">
            <span className={`status-dot ${status === 'finding' ? 'connecting' : status === 'connected' ? 'connected' : 'idle'}`}></span>
            {status === "idle" && "Ready to connect"}
            {status === "finding" && (activeRoom === 'random' ? "Finding a random partner..." : `Waiting in Room: ${activeRoom}`)}
            {status === "connected" && (activeRoom === 'random' ? "Connected!" : `Connected in Room: ${activeRoom}`)}
          </div>

          <div className={`video-container ${status !== 'idle' ? 'active' : ''}`}>
             <VideoPlayer stream={myStream} label="You" isLocal={true} />
             
             {Object.entries(remoteStreams).map(([peerId, stream], index) => (
               <VideoPlayer 
                 key={peerId} 
                 stream={stream} 
                 label={`Peer ${index + 1}`} 
                 muted={mutedPeers[peerId] || false}
                 onMuteToggle={() => togglePeerMute(peerId)}
               />
             ))}

             {status === 'connected' && !hasPeers && (
                <div style={{ color: '#94a3b8', alignSelf: 'center', margin: '2rem' }}>
                  Waiting for others to join...
                </div>
             )}
          </div>

          {status === "idle" ? (
            <div className="controls">
              <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => startFinding('random')} disabled={!peer}>
                Join Random Chat
              </button>
              
              <div className="room-controls">
                <div className="divider"><span>OR JOIN GROUP ROOM</span></div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Enter Room Code" 
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="room-input"
                  />
                  <button className="btn btn-secondary" onClick={joinSpecificRoom} disabled={!peer}>
                    Join
                  </button>
                </div>
                
                <button className="btn btn-outline" style={{ width: '100%' }} onClick={generateRoom}>
                  Generate Private Room
                </button>

                {shareLink && (
                   <div className="share-box">
                     <span>{shareLink}</span>
                     <button onClick={copyLink} className="copy-btn">Copy</button>
                   </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className={`btn ${isLocalMuted ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleLocalMute}>
                {isLocalMuted ? "🔇 Unmute Mic" : "🎤 Mute Mic"}
              </button>
              
              <button className="btn btn-danger" onClick={stopCall}>
                Leave
              </button>
              
              {activeRoom === 'random' && (
                <button className="btn btn-primary" onClick={() => { handleDisconnect(true); startFinding('random'); }}>
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ color: 'white' }}>Loading...</div>}>
      <ChatApp />
    </Suspense>
  );
}
