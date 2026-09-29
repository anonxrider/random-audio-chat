"use client";

import { useEffect, useState, useRef } from "react";
import type { Peer, MediaConnection } from "peerjs";

export default function Home() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [status, setStatus] = useState<"idle" | "finding" | "connected">("idle");
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [networkStats, setNetworkStats] = useState<{ latency: number; bitrate: number } | null>(null);
  
  const currentCallRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const partnerVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<Peer | null>(null);
  
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatsRef = useRef({ timestamp: 0, bytesReceived: 0, bytesSent: 0 });

  useEffect(() => {
    import("peerjs").then(({ default: Peer }) => {
      const newPeer = new Peer();
      newPeer.on("open", (id) => {
        console.log("My peer ID is: " + id);
      });
      
      newPeer.on("call", (call) => {
        console.log("Incoming call from: " + call.peer);
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
          setMyStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          call.answer(stream);
          currentCallRef.current = call;
          setStatus("connected");
          
          call.on("stream", (remoteStream) => {
            if (partnerVideoRef.current) {
              partnerVideoRef.current.srcObject = remoteStream;
            }
            startStatsInterval(call.peerConnection);
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
      if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
      }
      clearStatsInterval();
    };
  }, []);

  const startStatsInterval = (pc: RTCPeerConnection) => {
    clearStatsInterval();
    statsIntervalRef.current = setInterval(async () => {
      if (pc.signalingState === "closed") return;
      
      try {
        const reports = await pc.getStats();
        let currentLatency = 0;
        let currentBytesReceived = 0;
        let currentBytesSent = 0;
        
        reports.forEach(report => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            currentLatency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          }
          if (report.type === "inbound-rtp" && report.kind === "video") {
             currentBytesReceived += report.bytesReceived || 0;
          }
          if (report.type === "outbound-rtp" && report.kind === "video") {
             currentBytesSent += report.bytesSent || 0;
          }
        });

        const now = performance.now();
        const last = lastStatsRef.current;
        let kbps = 0;

        if (last.timestamp !== 0) {
          const timeDiff = (now - last.timestamp) / 1000;
          const bytesDiff = (currentBytesReceived + currentBytesSent) - (last.bytesReceived + last.bytesSent);
          if (bytesDiff > 0 && timeDiff > 0) {
            kbps = (bytesDiff * 8) / 1000 / timeDiff;
          }
        }

        lastStatsRef.current = {
          timestamp: now,
          bytesReceived: currentBytesReceived,
          bytesSent: currentBytesSent,
        };

        setNetworkStats({
          latency: Math.round(currentLatency),
          bitrate: Math.round(kbps),
        });
      } catch (err) {
        console.error("Error fetching stats", err);
      }
    }, 1000);
  };

  const clearStatsInterval = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    setNetworkStats(null);
    lastStatsRef.current = { timestamp: 0, bytesReceived: 0, bytesSent: 0 };
  };

  const handleDisconnect = () => {
    setStatus("idle");
    clearStatsInterval();
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (partnerVideoRef.current) {
      partnerVideoRef.current.srcObject = null;
    }
  };

  const stopCall = async () => {
    handleDisconnect();
    if (peerRef.current) {
      await fetch('/api/match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peerRef.current.id }),
      });
    }
  };

  const nextCall = async () => {
    handleDisconnect();
    await startFinding();
  };

  const startFinding = async () => {
    if (!peer || !peer.id) return;
    
    setStatus("finding");

    let stream = myStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setMyStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
        setStatus("idle");
        alert("Please allow camera and microphone access to chat.");
        return;
      }
    } else {
       if (localVideoRef.current && !localVideoRef.current.srcObject) {
         localVideoRef.current.srcObject = stream;
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
        const call = peer.call(data.match, stream);
        currentCallRef.current = call;
        setStatus("connected");

        call.on("stream", (remoteStream) => {
          if (partnerVideoRef.current) {
            partnerVideoRef.current.srcObject = remoteStream;
          }
          startStatsInterval(call.peerConnection);
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
          <p>Connect randomly and chat instantly face-to-face.</p>

          <div className="status-badge">
            <span className={`status-dot ${status === 'finding' ? 'connecting' : status === 'connected' ? 'connected' : 'idle'}`}></span>
            {status === "idle" && "Ready to connect"}
            {status === "finding" && "Finding a partner..."}
            {status === "connected" && "Connected!"}
          </div>
          
          {networkStats && (
            <div className="network-stats">
              <span title="Round Trip Time (Ping)">📶 {networkStats.latency} ms</span>
              <span title="Total Bitrate">⚡ {networkStats.bitrate} kbps</span>
            </div>
          )}

          <div className={`video-container ${status !== 'idle' ? 'active' : ''}`}>
             <div className="video-wrapper">
               <span className="video-label">You</span>
               <video ref={localVideoRef} autoPlay playsInline muted className="video-player" />
             </div>
             <div className="video-wrapper">
               <span className="video-label">Partner</span>
               <video ref={partnerVideoRef} autoPlay playsInline className="video-player" />
             </div>
          </div>

          {status === "idle" ? (
            <button className="btn btn-primary" onClick={startFinding} disabled={!peer}>
              Find a Partner
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
            Ensure your camera and microphone are enabled before starting.
          </div>
        </div>
      </main>
    </>
  );
}
