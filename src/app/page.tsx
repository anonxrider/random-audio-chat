"use client";

import { useEffect, useState, useRef } from "react";
import type { Peer, MediaConnection } from "peerjs";

export default function Home() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [status, setStatus] = useState<"idle" | "finding" | "connected">("idle");
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  
  const currentCallRef = useRef<MediaConnection | null>(null);
  const partnerAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with PeerJS
    import("peerjs").then(({ default: Peer }) => {
      const newPeer = new Peer();
      newPeer.on("open", (id) => {
        console.log("My peer ID is: " + id);
      });
      
      newPeer.on("call", (call) => {
        console.log("Incoming call from: " + call.peer);
        // If we're already connected to someone else, we probably shouldn't answer, 
        // but for a simple prototype we just answer.
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          setMyStream(stream);
          call.answer(stream);
          currentCallRef.current = call;
          setStatus("connected");
          
          call.on("stream", (remoteStream) => {
            if (partnerAudioRef.current) {
              partnerAudioRef.current.srcObject = remoteStream;
              // Browsers might block autoplay without user interaction, 
              // but since they clicked "Start" it should be fine.
              partnerAudioRef.current.play().catch(e => console.error("Audio play error:", e));
            }
          });

          call.on("close", () => {
            handleDisconnect();
          });
        });
      });

      setPeer(newPeer);
      peerRef.current = newPeer;
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const handleDisconnect = () => {
    setStatus("idle");
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (partnerAudioRef.current) {
      partnerAudioRef.current.srcObject = null;
    }
  };

  const stopCall = async () => {
    handleDisconnect();
    // Also remove from matching queue
    if (peerRef.current) {
      await fetch('/api/match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peerRef.current.id }),
      });
    }
  };

  const nextCall = async () => {
    // Stop the current connection without removing from queue manually since we'll re-enter
    handleDisconnect();
    
    // Start finding again immediately
    await startFinding();
  };

  const startFinding = async () => {
    if (!peer || !peer.id) return;
    
    setStatus("finding");

    let stream = myStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMyStream(stream);
      } catch (err) {
        console.error("Failed to get local stream", err);
        setStatus("idle");
        alert("Please allow microphone access to chat.");
        return;
      }
    }

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peer.id }),
      });
      const data = await res.json();

      if (data.match) {
        console.log("Found a match! Calling: ", data.match);
        // Call the match
        const call = peer.call(data.match, stream);
        currentCallRef.current = call;
        setStatus("connected");

        call.on("stream", (remoteStream) => {
          if (partnerAudioRef.current) {
            partnerAudioRef.current.srcObject = remoteStream;
            partnerAudioRef.current.play().catch(e => console.error("Audio play error:", e));
          }
        });

        call.on("close", () => {
          handleDisconnect();
        });
        
        call.on("error", (err) => {
          console.error("Call error:", err);
          handleDisconnect();
        });
      } else {
        console.log("Waiting in queue...");
        // Status is 'finding', waiting for 'peer.on("call")' to trigger
      }
    } catch (error) {
      console.error("Matchmaking error:", error);
      setStatus("idle");
    }
  };

  return (
    <>
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      
      <main className="container">
        <div className="glass-card">
          <h1>VibeChat</h1>
          <p>Connect randomly and chat instantly. No strings attached.</p>

          <div className="status-badge">
            <span className={`status-dot ${status === 'finding' ? 'connecting' : status === 'connected' ? 'connected' : 'idle'}`}></span>
            {status === "idle" && "Ready to connect"}
            {status === "finding" && "Finding a partner..."}
            {status === "connected" && "Connected!"}
          </div>

          <div className={`audio-visualizer ${status === 'connected' ? 'active' : ''}`}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>

          <audio ref={partnerAudioRef} style={{ display: 'none' }} />

          {status === "idle" ? (
            <button className="btn btn-primary" onClick={startFinding} disabled={!peer}>
              Find a Partner
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-danger" onClick={stopCall}>
                {status === "connected" ? "Disconnect" : "Cancel"}
              </button>
              {status === "connected" && (
                <button className="btn btn-primary" onClick={nextCall}>
                  Next
                </button>
              )}
            </div>
          )}

          <div className="footer-text">
            Ensure your microphone is enabled before starting.
          </div>
        </div>
      </main>
    </>
  );
}
