"use client";

import { useEffect, useState, useRef, useCallback, Suspense, memo } from "react";
import type { Peer, MediaConnection, DataConnection } from "peerjs";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Users,
  Info,
  Copy,
  Check,
  Keyboard,
  Plus,
  Send,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
  Radio,
  Hand,
  Smile,
  Pin,
  PinOff,
  Captions,
  CaptionsOff,
  CircleDot,
  Square,
  Settings,
  Volume2,
  PictureInPicture,
  VolumeX,
  UserMinus,
  Lock,
  Unlock,
  ShieldAlert,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";

export type VideoQuality = "720p" | "480p" | "360p" | "240p";

interface VideoQualityPreset {
  label: string;
  sublabel: string;
  width: number;
  height: number;
  frameRate: number;
}

const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualityPreset> = {
  "720p": {
    label: "High Definition (720p)",
    sublabel: "Best clarity, requires standard broadband (1280x720, 30fps)",
    width: 1280,
    height: 720,
    frameRate: 30,
  },
  "480p": {
    label: "Standard Definition (480p)",
    sublabel: "Balanced video quality and bandwidth (854x480, 30fps)",
    width: 854,
    height: 480,
    frameRate: 30,
  },
  "360p": {
    label: "Data Saver (360p)",
    sublabel: "Lower bandwidth usage for unstable networks (640x360, 24fps)",
    width: 640,
    height: 360,
    frameRate: 24,
  },
  "240p": {
    label: "Low Bandwidth (240p)",
    sublabel: "Maximum data saving on mobile connections (426x240, 15fps)",
    width: 426,
    height: 240,
    frameRate: 15,
  },
};

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  leftPercent: number;
}

// Google Meet Logo Component
function GoogleMeetLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 16L38 10V38L30 32V16Z" fill="#00AC47" />
      <path d="M26 12H10C7.79 12 6 13.79 6 16V32C6 34.21 7.79 36 10 36H26C28.21 36 30 34.21 30 32V16C30 13.79 28.21 12 26 12Z" fill="#00832D" />
      <path d="M6 32C6 34.21 7.79 36 10 36H26V28H6V32Z" fill="#2684FC" />
      <path d="M30 16V24H38V10L30 16Z" fill="#0066DA" />
      <path d="M6 16C6 13.79 7.79 12 10 12H18V20H6V16Z" fill="#FFBA00" />
      <path d="M26 12H18V20H30V16C30 13.79 28.21 12 26 12Z" fill="#00832D" />
      <path d="M6 28H18V36H10C7.79 36 6 34.21 6 32V28Z" fill="#EA4335" />
    </svg>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ color: "white", padding: "2rem" }}>Loading OrbitMeet...</div>}>
      <GoogleMeetApp />
    </Suspense>
  );
}

function GoogleMeetApp() {
  // Navigation & View States
  const [view, setView] = useState<"lobby" | "meeting">("lobby");
  const [currentTime, setCurrentTime] = useState("");
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // User Media & Devices
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Peer & Room States
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [turnConfigured, setTurnConfigured] = useState<boolean>(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteMicMuted, setRemoteMicMuted] = useState<Record<string, boolean>>({});

  // Room IDs & Links
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomIdFromUrl = searchParams.get("room");
  const [roomInput, setRoomInput] = useState<string>(roomIdFromUrl || "");
  const [activeRoom, setActiveRoom] = useState<string>(roomIdFromUrl || "");

  // Side Drawer Tabs: null | "chat" | "people" | "info"
  const [activeDrawer, setActiveDrawer] = useState<"chat" | "people" | "info" | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Advanced Google Meet Features
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [remoteHands, setRemoteHands] = useState<Record<string, boolean>>({});
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingEmoji[]>([]);
  const [pinnedPeer, setPinnedPeer] = useState<string | "local" | null>(null);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [activeCaption, setActiveCaption] = useState<{ sender: string; text: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>("720p");

  // Feature 1: Picture in Picture
  const [isPipActive, setIsPipActive] = useState(false);

  // Feature 2: Host Moderation & Waiting Room
  const [isHost, setIsHost] = useState(false);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [knockingPeer, setKnockingPeer] = useState<{ peerId: string; name: string } | null>(null);
  const [isWaitingAdmission, setIsWaitingAdmission] = useState(false);
  const [showHostEndDialog, setShowHostEndDialog] = useState(false);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const activeRoomRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const callsRef = useRef<Record<string, MediaConnection>>({});
  const dataConnsRef = useRef<Record<string, DataConnection>>({});
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const localMeetingVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null);

  // 1. Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }) +
          " • " +
          now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. In-Call Elapsed Timer
  useEffect(() => {
    if (!callStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStartTime]);

  // Picture in Picture event listeners
  useEffect(() => {
    const handlePipChange = () => {
      setIsPipActive(Boolean(document.pictureInPictureElement));
    };
    document.addEventListener("enterpictureinpicture", handlePipChange);
    document.addEventListener("leavepictureinpicture", handlePipChange);
    return () => {
      document.removeEventListener("enterpictureinpicture", handlePipChange);
      document.removeEventListener("leavepictureinpicture", handlePipChange);
    };
  }, []);

  const formatElapsed = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Enumerate Audio/Video Devices for Settings
  const refreshDevices = async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setAvailableVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      }
    } catch (err) {
      console.warn("Could not enumerate media devices:", err);
    }
  };

  // Peer Handlers declared before useEffect
  const removePeer = (remotePeerId: string) => {
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
    setRemoteMicMuted((prev) => {
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
    setRemoteHands((prev) => {
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
    if (callsRef.current[remotePeerId]) {
      callsRef.current[remotePeerId].close();
      delete callsRef.current[remotePeerId];
    }
    if (dataConnsRef.current[remotePeerId]) {
      dataConnsRef.current[remotePeerId].close();
      delete dataConnsRef.current[remotePeerId];
    }
    if (pinnedPeer === remotePeerId) {
      setPinnedPeer(null);
    }
  };

  const setupCallHandlers = (call: MediaConnection) => {
    callsRef.current[call.peer] = call;

    call.on("stream", (remoteStream) => {
      setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
    });

    call.on("close", () => {
      removePeer(call.peer);
    });

    call.on("error", () => {
      removePeer(call.peer);
    });
  };

  const triggerReaction = (emoji: string, broadcast = true) => {
    const newEmoji: FloatingEmoji = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      leftPercent: 20 + Math.random() * 60,
    };
    setFloatingReactions((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== newEmoji.id));
    }, 2800);

    if (broadcast) {
      Object.values(dataConnsRef.current).forEach((conn) => {
        conn.send({ type: "reaction", emoji });
      });
    }
  };

  const setupDataConnection = (conn: DataConnection) => {
    dataConnsRef.current[conn.peer] = conn;

    conn.on("data", (data: unknown) => {
      const payload = data as {
        type: string;
        text?: string;
        sender?: string;
        isMuted?: boolean;
        isHandRaised?: boolean;
        emoji?: string;
        approved?: boolean;
      };

      if (payload.type === "chat" && payload.text) {
        const newMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: payload.sender || "Participant",
          text: payload.text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        };
        setMessages((prev) => [...prev, newMsg]);
        setUnreadCount((c) => (activeDrawer === "chat" ? 0 : c + 1));
      } else if (payload.type === "mute-state") {
        setRemoteMicMuted((prev) => ({
          ...prev,
          [conn.peer]: Boolean(payload.isMuted),
        }));
      } else if (payload.type === "hand-raise") {
        const isRaised = Boolean(payload.isHandRaised);
        setRemoteHands((prev) => ({
          ...prev,
          [conn.peer]: isRaised,
        }));
        if (isRaised) {
          showToast("A participant raised their hand ✋");
        }
      } else if (payload.type === "reaction" && payload.emoji) {
        triggerReaction(payload.emoji, false);
      } else if (payload.type === "caption" && payload.text) {
        setActiveCaption({ sender: payload.sender || "Participant", text: payload.text });
        if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
        captionTimerRef.current = setTimeout(() => {
          setActiveCaption(null);
        }, 4000);
      } else if (payload.type === "force-mute") {
        // Host has forced mute on us
        if (streamRef.current) {
          const audioTrack = streamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = false;
            setIsMicMuted(true);
            showToast("The host muted your microphone 🔇");
            Object.values(dataConnsRef.current).forEach((c) => {
              c.send({ type: "mute-state", isMuted: true });
            });
          }
        }
      } else if (payload.type === "kick-peer") {
        showToast("You were removed from the meeting by the host");
        leaveMeeting();
      } else if (payload.type === "end-call-all") {
        showToast("The meeting was ended by the host");
        leaveMeeting();
      } else if (payload.type === "knock-request") {
        // Host receives a knock request
        setKnockingPeer({ peerId: conn.peer, name: payload.sender || "Guest Participant" });
        showToast(`✋ ${payload.sender || "A guest"} is asking to join`);
      } else if (payload.type === "knock-response") {
        if (payload.approved === false) {
          setIsWaitingAdmission(false);
          showToast("The host denied your request to join.");
          leaveMeeting();
        } else if (payload.approved === true) {
          setIsWaitingAdmission(false);
          showToast("You were admitted to the meeting!");
          const currentPeer = peerRef.current?.id;
          const currentStream = streamRef.current;
          if (currentPeer && currentStream && activeRoomRef.current) {
            const targetRoom = activeRoomRef.current;
            fetch("/api/match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ peerId: currentPeer, roomId: targetRoom }),
            })
              .then((r) => r.json())
              .then((d) => {
                const peers: string[] = d.peers || [];
                peers.forEach((remoteId) => {
                  if (!callsRef.current[remoteId] && peerRef.current && currentStream) {
                    const call = peerRef.current.call(remoteId, currentStream);
                    setupCallHandlers(call);
                    const conn = peerRef.current.connect(remoteId);
                    setupDataConnection(conn);
                  }
                });

                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = setInterval(async () => {
                  try {
                    const pollRes = await fetch(`/api/match?peerId=${currentPeer}&roomId=${targetRoom}`);
                    const pollData = await pollRes.json();
                    const activePeers: string[] = pollData.peers || [];
                    activePeers.forEach((remoteId) => {
                      if (!callsRef.current[remoteId] && peerRef.current && streamRef.current) {
                        const call = peerRef.current.call(remoteId, streamRef.current);
                        setupCallHandlers(call);
                        const conn = peerRef.current.connect(remoteId);
                        setupDataConnection(conn);
                      }
                    });
                  } catch {
                    // Ignore
                  }
                }, 2500);
              })
              .catch(() => {});
          }
        }
      }
    });

    conn.on("close", () => {
      delete dataConnsRef.current[conn.peer];
    });
  };

  // 3. Acquire Preview Stream on initial load
  useEffect(() => {
    let active = true;

    async function initPreviewMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setMyStream(stream);
        streamRef.current = stream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
        refreshDevices();
      } catch (err) {
        console.warn("Could not acquire initial camera/mic preview:", err);
      }
    }

    initPreviewMedia();

    return () => {
      active = false;
    };
  }, []);

  // Callback refs to immediately attach stream whenever any video element mounts
  const setLocalVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localMeetingVideoRef.current = el;
      const activeStream = myStream || streamRef.current;
      if (el && activeStream) {
        if (el.srcObject !== activeStream) {
          el.srcObject = activeStream;
        }
        el.play().catch(() => {});
      }
    },
    [myStream]
  );

  const setPreviewVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      previewVideoRef.current = el;
      const activeStream = myStream || streamRef.current;
      if (el && activeStream) {
        if (el.srcObject !== activeStream) {
          el.srcObject = activeStream;
        }
        el.play().catch(() => {});
      }
    },
    [myStream]
  );

  // Keep video refs synced with local stream across views, pinning, and camera toggles
  useEffect(() => {
    const activeStream = myStream || streamRef.current;
    if (previewVideoRef.current && activeStream) {
      if (previewVideoRef.current.srcObject !== activeStream) {
        previewVideoRef.current.srcObject = activeStream;
      }
      previewVideoRef.current.play().catch(() => {});
    }
    if (localMeetingVideoRef.current && activeStream) {
      if (localMeetingVideoRef.current.srcObject !== activeStream) {
        localMeetingVideoRef.current.srcObject = activeStream;
      }
      localMeetingVideoRef.current.play().catch(() => {});
    }
  }, [myStream, view, pinnedPeer, isVideoOff]);

  // 4. Initialize PeerJS with Cloudflare Anycast TURN
  useEffect(() => {
    let isCancelled = false;

    async function initCloudflarePeer() {
      try {
        let iceServers: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];

        try {
          const turnRes = await fetch("/api/turn");
          if (turnRes.ok) {
            const data = await turnRes.json();
            if (data.iceServers) {
              iceServers = data.iceServers;
              setTurnConfigured(true);
            }
          }
        } catch (e) {
          console.warn("Cloudflare TURN fetch failed, falling back to STUN", e);
        }

        if (isCancelled) return;

        const { default: Peer } = await import("peerjs");
        const newPeer = new Peer({
          config: {
            iceServers,
            iceCandidatePoolSize: 10,
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
          },
        });

        newPeer.on("open", (id) => {
          setPeerId(id);
        });

        newPeer.on("call", (call) => {
          if (streamRef.current) {
            call.answer(streamRef.current);
            setupCallHandlers(call);
          } else {
            navigator.mediaDevices
              .getUserMedia({
                video: { width: 640, height: 360, frameRate: 24 },
                audio: { echoCancellation: true, noiseSuppression: true },
              })
              .then((stream) => {
                setMyStream(stream);
                streamRef.current = stream;
                call.answer(stream);
                setupCallHandlers(call);
              });
          }
        });

        newPeer.on("connection", (conn) => {
          setupDataConnection(conn);
        });

        setPeer(newPeer);
        peerRef.current = newPeer;
      } catch (err) {
        console.error("PeerJS initialization error:", err);
      }
    }

    initCloudflarePeer();

    return () => {
      isCancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5. Join or Create Meeting
  const enterMeeting = async (targetRoom: string, createdByMe = false) => {
    if (!peerRef.current || !peerRef.current.id) {
      showToast("Connecting to network, please try again in a second...");
      return;
    }

    const currentPeerId = peerRef.current.id;
    setActiveRoom(targetRoom);
    activeRoomRef.current = targetRoom;
    setCallStartTime(Date.now());
    setElapsedSeconds(0);
    setView("meeting");
    router.push(`/?room=${targetRoom}`);

    let stream = streamRef.current;
    if (!stream) {
      try {
        const preset = VIDEO_QUALITY_PRESETS[selectedQuality] || VIDEO_QUALITY_PRESETS["720p"];
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedVideoId ? { exact: selectedVideoId } : undefined,
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: preset.frameRate, max: preset.frameRate },
          },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setMyStream(stream);
        streamRef.current = stream;
      } catch (err) {
        console.error("Camera/Mic permission failed:", err);
        showToast("Please allow camera and mic permissions to join.");
      }
    }

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: currentPeerId, roomId: targetRoom }),
      });
      const data = await res.json();

      if (data.locked && !createdByMe) {
        setIsWaitingAdmission(true);
        showToast("Room is locked. Knocking to request admission...");
        if (data.hostId && peerRef.current) {
          const hostConn = peerRef.current.connect(data.hostId);
          setupDataConnection(hostConn);
          hostConn.on("open", () => {
            hostConn.send({
              type: "knock-request",
              sender: `Guest (${currentPeerId.slice(0, 4)})`,
            });
          });
        }
        return;
      }

      setIsRoomLocked(Boolean(data.isLocked));
      const existingPeers: string[] = data.peers || [];

      // If we created the room or were the first person in room, we are the Host!
      if (createdByMe || data.isHost || existingPeers.length === 0) {
        setIsHost(true);
      } else {
        setIsHost(false);
      }

      existingPeers.forEach((remoteId) => {
        if (!peerRef.current || !stream) return;
        const call = peerRef.current.call(remoteId, stream);
        setupCallHandlers(call);

        const conn = peerRef.current.connect(remoteId);
        setupDataConnection(conn);
      });

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/match?peerId=${currentPeerId}&roomId=${targetRoom}`);
          const pollData = await pollRes.json();
          const activePeers: string[] = pollData.peers || [];

          activePeers.forEach((remoteId) => {
            if (!callsRef.current[remoteId] && peerRef.current && streamRef.current) {
              const call = peerRef.current.call(remoteId, streamRef.current);
              setupCallHandlers(call);
              const conn = peerRef.current.connect(remoteId);
              setupDataConnection(conn);
            }
          });
        } catch {
          // Ignore
        }
      }, 2500);
    } catch (err) {
      console.error("Meeting join error:", err);
      showToast("Could not join room. Please try again.");
    }
  };

  const createInstantMeeting = () => {
    const p1 = Math.random().toString(36).substring(2, 5);
    const p2 = Math.random().toString(36).substring(2, 6);
    const p3 = Math.random().toString(36).substring(2, 5);
    const code = `${p1}-${p2}-${p3}`;
    setRoomInput(code);
    enterMeeting(code, true);
  };

  const joinExistingMeeting = () => {
    const cleaned = roomInput.trim().toLowerCase();
    if (!cleaned) {
      showToast("Please enter a meeting code or link");
      return;
    }
    const match = cleaned.match(/room=([a-zA-Z0-9_-]+)/);
    const code = match ? match[1] : cleaned;
    enterMeeting(code, false);
  };

  const leaveMeeting = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (peerRef.current && activeRoom) {
      try {
        await fetch("/api/match", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerId: peerRef.current.id, roomId: activeRoom }),
        });
      } catch {
        // Ignore
      }
    }

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Stop captions if active
    if (isCaptionsOn) {
      toggleCaptions();
    }

    // Exit PiP if active
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};
    Object.values(dataConnsRef.current).forEach((conn) => conn.close());
    dataConnsRef.current = {};

    setRemoteStreams({});
    setRemoteMicMuted({});
    setRemoteHands({});
    setMessages([]);
    setActiveDrawer(null);
    setCallStartTime(null);
    setElapsedSeconds(0);
    setIsHandRaised(false);
    setPinnedPeer(null);
    setIsHost(false);
    setIsRoomLocked(false);
    setKnockingPeer(null);
    setIsWaitingAdmission(false);
    setView("lobby");
    router.push("/");
    showToast("You left the meeting");
  };

  // 6. Device Toggles (Mic, Camera, Screen Share)
  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMicMuted(newMuted);

        Object.values(dataConnsRef.current).forEach((conn) => {
          conn.send({ type: "mute-state", isMuted: newMuted });
        });
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      const camTrack = cameraVideoTrackRef.current;
      if (camTrack && camTrack.readyState === "live") {
        Object.values(callsRef.current).forEach((call) => {
          const sender = call.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(camTrack);
        });

        if (streamRef.current) {
          const currentVideo = streamRef.current.getVideoTracks()[0];
          if (currentVideo) streamRef.current.removeTrack(currentVideo);
          streamRef.current.addTrack(camTrack);
          setMyStream(new MediaStream(streamRef.current.getTracks()));
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          showToast("Screen sharing is not supported in this browser.");
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;
        screenTrack.contentHint = "detail";

        screenStreamRef.current = screenStream;

        if (streamRef.current) {
          const camTrack = streamRef.current.getVideoTracks()[0];
          if (camTrack) cameraVideoTrackRef.current = camTrack;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        Object.values(callsRef.current).forEach((call) => {
          const sender = call.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (streamRef.current) {
          const oldVideo = streamRef.current.getVideoTracks()[0];
          if (oldVideo) streamRef.current.removeTrack(oldVideo);
          streamRef.current.addTrack(screenTrack);
          setMyStream(new MediaStream(streamRef.current.getTracks()));
        }

        setIsScreenSharing(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "NotAllowedError") {
          showToast("Could not start screen sharing.");
        }
      }
    }
  };

  // 7. Advanced Feature: Raise Hand
  const toggleHandRaise = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    showToast(newState ? "You raised your hand ✋" : "Hand lowered");

    Object.values(dataConnsRef.current).forEach((conn) => {
      conn.send({ type: "hand-raise", isHandRaised: newState });
    });
  };

  // 8. Advanced Feature: Live Speech-to-Text Closed Captions
  const toggleCaptions = () => {
    if (isCaptionsOn) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      setIsCaptionsOn(false);
      setActiveCaption(null);
      showToast("Captions turned off");
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast("Live captions not supported on this browser.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setActiveCaption({ sender: "You", text: transcript });
            Object.values(dataConnsRef.current).forEach((conn) => {
              conn.send({ type: "caption", text: transcript, sender: "Participant" });
            });
            if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
            captionTimerRef.current = setTimeout(() => setActiveCaption(null), 4000);
          }
        };

        recognition.onerror = () => {
          // ignore speech errors
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        setIsCaptionsOn(true);
        showToast("Live captions turned on (English)");
      } catch (err) {
        console.error("Speech recognition error:", err);
        showToast("Could not start speech recognition.");
      }
    }
  };

  // 9. Advanced Feature: Meeting Recording (MediaRecorder)
  const startRecording = () => {
    if (!streamRef.current) {
      showToast("Cannot record: no active stream found.");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const streamToRecord = screenStreamRef.current || streamRef.current;
      const recorder = new MediaRecorder(streamToRecord, { mimeType: "video/webm" });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `OrbitMeet-Recording-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          showToast("Meeting recording saved & downloaded");
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      showToast("Meeting recording started");
    } catch (err) {
      console.error("Recording error:", err);
      showToast("Recording not supported or failed to start.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 10. Picture-in-Picture (PiP) Implementation
  const togglePictureInPicture = async (targetVideo?: HTMLVideoElement | null | unknown) => {
    try {
      if (!document.pictureInPictureEnabled) {
        showToast("Picture-in-Picture is not supported in this browser.");
        return;
      }
      const requestedVideo =
        targetVideo && typeof targetVideo === "object" && "requestPictureInPicture" in (targetVideo as object)
          ? (targetVideo as HTMLVideoElement)
          : null;

      if (document.pictureInPictureElement) {
        const currentPip = document.pictureInPictureElement;
        await document.exitPictureInPicture();
        setIsPipActive(false);
        if (requestedVideo && requestedVideo !== currentPip) {
          await requestedVideo.requestPictureInPicture();
          setIsPipActive(true);
        }
      } else {
        const videoToPip =
          requestedVideo ||
          (pinnedPeer && pinnedPeer !== "local"
            ? (document.querySelector(`.remote-tile-${pinnedPeer} video`) as HTMLVideoElement)
            : null) ||
          (document.querySelector(".remote-video-element") as HTMLVideoElement) ||
          localMeetingVideoRef.current ||
          (document.querySelector(".video-element") as HTMLVideoElement);

        if (videoToPip) {
          await videoToPip.requestPictureInPicture();
          setIsPipActive(true);
        } else {
          showToast("No active video stream found to enter Picture-in-Picture.");
        }
      }
    } catch (err) {
      console.warn("PiP error:", err);
      showToast("Could not enter Picture-in-Picture mode.");
    }
  };

  // 11. Host Moderation Actions
  const muteAllParticipants = () => {
    Object.values(dataConnsRef.current).forEach((conn) => {
      conn.send({ type: "force-mute" });
    });
    showToast("Muted all participants");
  };

  const muteParticipant = (targetId: string) => {
    const conn = dataConnsRef.current[targetId];
    if (conn) {
      conn.send({ type: "force-mute" });
      showToast("Muted participant");
    }
  };

  const kickParticipant = async (targetId: string) => {
    const conn = dataConnsRef.current[targetId];
    if (conn) {
      try {
        conn.send({ type: "kick-peer" });
      } catch {}
    }
    try {
      await fetch("/api/match", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom,
          kickPeerId: targetId,
        }),
      });
    } catch (e) {
      console.warn("Failed to notify server of kicked peer:", e);
    }
    removePeer(targetId);
    showToast("Removed participant from call");
  };

  const endMeetingForEveryone = async () => {
    Object.values(dataConnsRef.current).forEach((conn) => {
      try {
        conn.send({ type: "end-call-all" });
      } catch (e) {
        console.warn("Failed sending end-call-all:", e);
      }
    });

    if (activeRoom) {
      try {
        await fetch("/api/match", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: activeRoom, endRoomForAll: true }),
        });
      } catch (e) {
        console.warn("Failed notifying room deletion:", e);
      }
    }

    setShowHostEndDialog(false);
    showToast("You ended the call for everyone");
    leaveMeeting();
  };

  const toggleRoomLock = async () => {
    const nextLocked = !isRoomLocked;
    setIsRoomLocked(nextLocked);
    try {
      await fetch("/api/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom,
          isLocked: nextLocked,
          hostId: peerRef.current?.id,
        }),
      });
      showToast(nextLocked ? "Room locked. New participants must knock to join." : "Room unlocked.");
    } catch (err) {
      console.warn("Room lock sync error:", err);
      showToast(nextLocked ? "Room locked locally." : "Room unlocked locally.");
    }
  };

  const admitPeer = async (peerInfo: { peerId: string; name: string }) => {
    try {
      await fetch("/api/match", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoom,
          admitPeerId: peerInfo.peerId,
        }),
      });
    } catch (err) {
      console.warn("Failed to notify server of admission:", err);
    }

    const conn = dataConnsRef.current[peerInfo.peerId];
    if (conn) {
      conn.send({ type: "knock-response", approved: true });
    }
    if (peerRef.current && streamRef.current) {
      const call = peerRef.current.call(peerInfo.peerId, streamRef.current);
      setupCallHandlers(call);
    }
    setKnockingPeer(null);
    showToast(`Admitted ${peerInfo.name}`);
  };

  const denyPeer = (peerInfo: { peerId: string; name: string }) => {
    const conn = dataConnsRef.current[peerInfo.peerId];
    if (conn) {
      conn.send({ type: "knock-response", approved: false });
    }
    if (callsRef.current[peerInfo.peerId]) {
      callsRef.current[peerInfo.peerId].close();
    }
    delete dataConnsRef.current[peerInfo.peerId];
    setKnockingPeer(null);
    showToast(`Denied entry for ${peerInfo.name}`);
  };

  // 12. Change Devices in Settings Modal
  const switchDevice = async (audioId?: string, videoId?: string) => {
    const aId = audioId ?? selectedAudioId;
    const vId = videoId ?? selectedVideoId;
    const preset = VIDEO_QUALITY_PRESETS[selectedQuality] || VIDEO_QUALITY_PRESETS["720p"];

    try {
      const constraints: MediaStreamConstraints = {
        audio: aId ? { deviceId: { exact: aId } } : true,
        video: vId
          ? {
              deviceId: { exact: vId },
              width: { ideal: preset.width, max: preset.width },
              height: { ideal: preset.height, max: preset.height },
              frameRate: { ideal: preset.frameRate, max: preset.frameRate },
            }
          : {
              width: { ideal: preset.width, max: preset.width },
              height: { ideal: preset.height, max: preset.height },
              frameRate: { ideal: preset.frameRate, max: preset.frameRate },
            },
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      setMyStream(newStream);
      streamRef.current = newStream;

      const newAudioTrack = newStream.getAudioTracks()[0];
      const newVideoTrack = newStream.getVideoTracks()[0];

      Object.values(callsRef.current).forEach((call) => {
        const pc = call.peerConnection;
        if (pc) {
          if (newAudioTrack) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
            if (sender) sender.replaceTrack(newAudioTrack);
          }
          if (newVideoTrack && !isScreenSharing) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(newVideoTrack);
          }
        }
      });

      if (aId) setSelectedAudioId(aId);
      if (vId) setSelectedVideoId(vId);
      showToast("Media devices updated");
    } catch (err) {
      console.error("Error switching device:", err);
      showToast("Failed to switch media device.");
    }
  };

  // 13. Dynamic Video Quality Switching (720p, 480p, 360p, 240p)
  const switchVideoQuality = async (quality: VideoQuality) => {
    setSelectedQuality(quality);
    const preset = VIDEO_QUALITY_PRESETS[quality];
    if (!preset) return;

    try {
      const activeStream = streamRef.current;
      const currentTrack = activeStream?.getVideoTracks()[0];

      // Attempt 1: Apply constraints directly to live track (instant, zero flicker)
      let constraintApplied = false;
      if (currentTrack && !isScreenSharing && currentTrack.readyState === "live") {
        try {
          await currentTrack.applyConstraints({
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: preset.frameRate, max: preset.frameRate },
          });
          constraintApplied = true;
        } catch {
          constraintApplied = false;
        }
      }

      // Attempt 2: If in-flight constraint didn't apply or webcam requires track restart
      if (!constraintApplied && !isScreenSharing) {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            deviceId: selectedVideoId ? { exact: selectedVideoId } : undefined,
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: preset.frameRate, max: preset.frameRate },
          },
        };

        const newVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack = newVideoStream.getVideoTracks()[0];

        if (activeStream && newTrack) {
          const oldTrack = activeStream.getVideoTracks()[0];
          if (oldTrack) {
            oldTrack.stop();
            activeStream.removeTrack(oldTrack);
          }
          activeStream.addTrack(newTrack);
          setMyStream(new MediaStream(activeStream.getTracks()));

          // Update active WebRTC peer connections
          Object.values(callsRef.current).forEach((call) => {
            const sender = call.peerConnection?.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newTrack);
            }
          });
        }
      }

      showToast(`Video quality set to ${preset.label}`);
    } catch (err) {
      console.warn("Quality switch error:", err);
      showToast(`Video quality set to ${preset.label}`);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    const myMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "You",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    setMessages((prev) => [...prev, myMsg]);
    setChatInput("");

    Object.values(dataConnsRef.current).forEach((conn) => {
      conn.send({ type: "chat", text, sender: "Participant" });
    });
  };

  const copyMeetingLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/?room=${activeRoom}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Meeting link copied to clipboard");
    }
  };

  const participantCount = Object.keys(remoteStreams).length + 1;
  const remotePeersList = Object.entries(remoteStreams);

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="settings-header">
            <span style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text-main)" }}>
              Audio, Video & Quality Settings
            </span>
            <button
              className="drawer-close-btn"
              onClick={() => setShowSettings(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="settings-body">
            <div className="settings-field">
              <label className="settings-label">
                <Volume2 size={15} /> Microphone (Audio Input)
              </label>
              <select
                className="settings-select"
                value={selectedAudioId}
                onChange={(e) => switchDevice(e.target.value, undefined)}
              >
                {availableAudioDevices.length > 0 ? (
                  availableAudioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Microphone</option>
                )}
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-label">
                <VideoIcon size={15} /> Camera (Video Input)
              </label>
              <select
                className="settings-select"
                value={selectedVideoId}
                onChange={(e) => switchDevice(undefined, e.target.value)}
              >
                {availableVideoDevices.length > 0 ? (
                  availableVideoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Camera</option>
                )}
              </select>
            </div>

            {/* Video Quality (Resolution) Setting */}
            <div className="settings-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="settings-label">
                  <SlidersHorizontal size={15} /> Send Resolution (Video Quality)
                </label>
                <span className="quality-pill">{selectedQuality.toUpperCase()}</span>
              </div>
              <select
                className="settings-select"
                value={selectedQuality}
                onChange={(e) => switchVideoQuality(e.target.value as VideoQuality)}
              >
                <option value="720p">High Definition (720p) - Best Quality</option>
                <option value="480p">Standard Definition (480p) - Balanced</option>
                <option value="360p">Data Saver (360p) - Medium</option>
                <option value="240p">Low Bandwidth (240p) - Conserve Data</option>
              </select>
              <div className="settings-hint">
                {VIDEO_QUALITY_PRESETS[selectedQuality]?.sublabel || "Adjusts camera resolution in real time."}
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">
                <ShieldCheck size={15} /> WebRTC Network Relay
              </label>
              <div style={{ fontSize: "0.85rem", color: "#81c995" }}>
                Cloudflare Anycast TURN relay active
              </div>
            </div>
          </div>
          <div className="settings-footer">
            <button
              className="btn-new-meeting"
              style={{ padding: "0.5rem 1.2rem" }}
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: LOBBY VIEW
  // ============================================================
  if (view === "lobby") {
    return (
      <div className="lobby-container">
        {toastMessage && <div className="toast-notice">{toastMessage}</div>}

        {/* Top App Bar */}
        <header className="lobby-header">
          <div className="brand-group">
            <div className="brand-logo-icon">
              <GoogleMeetLogo />
            </div>
            <span className="brand-title">OrbitMeet</span>
            <span className="brand-badge">PRO</span>
          </div>

          <div className="header-right">
            <div className="live-time-display">{currentTime}</div>
            <div className="cf-turn-pill" title="Anycast STUN/TURN Powered">
              <Radio size={13} color="#f97316" />
              <span>{turnConfigured ? "Cloudflare Anycast TURN Active" : "Connecting Relay..."}</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="lobby-main">
          {/* Left Hero Column */}
          <div className="hero-text-block">
            <h1 className="hero-headline">
              Premium video meetings. <span>Fast, secure & free.</span>
            </h1>
            <p className="hero-description">
              Connect with anyone, anywhere with crystal-clear WebRTC audio, high-definition video, and instant
              screen sharing routed through Cloudflare&apos;s Anycast global network.
            </p>

            {/* Quick Action Row */}
            <div className="hero-action-row">
              <button
                id="btn-new-meeting"
                className="btn-new-meeting"
                onClick={createInstantMeeting}
                disabled={!peer}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>New meeting</span>
              </button>

              <div className="join-input-group">
                <Keyboard size={18} className="keyboard-icon" />
                <input
                  id="room-input"
                  type="text"
                  placeholder="Enter a code or link"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinExistingMeeting()}
                  className="room-code-input"
                />
                <button
                  id="btn-join"
                  className="btn-join"
                  onClick={joinExistingMeeting}
                  disabled={!roomInput.trim() || !peer}
                >
                  Join
                </button>
              </div>
            </div>

            {/* Feature Points */}
            <div className="hero-features-list">
              <div className="feature-item">
                <Sparkles size={16} className="feature-dot" />
                <span>Instant one-click join</span>
              </div>
              <div className="feature-item">
                <ShieldCheck size={16} className="feature-dot" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="feature-item">
                <Radio size={16} className="feature-dot" />
                <span>Cloudflare TURN NAT traversal</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Green Room Device Preview */}
          <div className="preview-card">
            <div className="preview-video-container">
              {isVideoOff ? (
                <div className="preview-avatar-placeholder">
                  <div className="avatar-circle">Y</div>
                  <span>Camera is turned off</span>
                </div>
              ) : (
                <video
                  ref={setPreviewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="preview-video mirror"
                />
              )}

              {/* Floating Device Toggles on Preview */}
              <div className="preview-controls-overlay">
                <button
                  id="preview-mic-btn"
                  className={`btn-preview-circle ${isMicMuted ? "muted" : ""}`}
                  onClick={toggleMicrophone}
                  title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                  aria-label="Toggle microphone"
                >
                  {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
                </button>
                <button
                  id="preview-cam-btn"
                  className={`btn-preview-circle ${isVideoOff ? "danger" : ""}`}
                  onClick={toggleCamera}
                  title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                  aria-label="Toggle camera"
                >
                  {isVideoOff ? <VideoOff size={19} /> : <VideoIcon size={19} />}
                </button>
              </div>
            </div>

            <div className="preview-footer">
              <div className="preview-status-indicator">
                <div className="audio-level-dots">
                  <div className="audio-level-dot"></div>
                  <div className="audio-level-dot"></div>
                  <div className="audio-level-dot"></div>
                </div>
                <span>{isMicMuted ? "Microphone muted" : "Microphone ready"}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="quality-pill">{selectedQuality.toUpperCase()}</span>
                <button
                  className="btn-preview-circle"
                  style={{ width: "32px", height: "32px" }}
                  onClick={() => {
                    refreshDevices();
                    setShowSettings(true);
                  }}
                  title="Audio, Video & Quality Settings"
                  aria-label="Settings"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
          </div>
        </main>

        {renderSettingsModal()}
      </div>
    );
  }

  // ============================================================
  // RENDER: IN-MEETING ROOM VIEW (Google Meet Experience)
  // ============================================================
  return (
    <div className="meeting-room-container">
      {toastMessage && <div className="toast-notice">{toastMessage}</div>}

      {/* Floating Reaction Animation Emojis */}
      {floatingReactions.map((item) => (
        <div
          key={item.id}
          className="floating-reaction"
          style={{ left: `${item.leftPercent}%` }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Waiting Room Knock Admission Toast Card (Host Only) */}
      {isHost && knockingPeer && (
        <div className="knock-admission-card">
          <UserCheck size={20} color="#8ab4f8" />
          <div className="knock-info-text">
            <span className="knock-title">{knockingPeer.name} wants to join</span>
            <span className="knock-sub">Someone is asking to enter this locked meeting</span>
          </div>
          <div className="knock-actions">
            <button className="btn-admit" onClick={() => admitPeer(knockingPeer)}>
              Admit
            </button>
            <button className="btn-deny" onClick={() => denyPeer(knockingPeer)}>
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Guest Waiting Admission Overlay */}
      {isWaitingAdmission && (
        <div className="waiting-admission-overlay">
          <div className="waiting-admission-card">
            <div className="waiting-pulse-avatar">
              <ShieldAlert size={36} color="#8ab4f8" />
            </div>
            <h2>Asking to be let in...</h2>
            <p>You&apos;ll join the call as soon as the meeting host approves your request.</p>
            <div className="waiting-room-spinner" />
            <button
              className="btn-cancel-waiting"
              onClick={() => {
                setIsWaitingAdmission(false);
                leaveMeeting();
              }}
            >
              Cancel request
            </button>
          </div>
        </div>
      )}

      {/* Host End Meeting Confirmation Dialog */}
      {showHostEndDialog && (
        <div className="modal-backdrop" onClick={() => setShowHostEndDialog(false)} style={{ zIndex: 120 }}>
          <div className="host-end-card" onClick={(e) => e.stopPropagation()}>
            <h3>Leave meeting?</h3>
            <p>
              As the meeting host, you can end the call for everyone, or leave the meeting and let others continue.
            </p>
            <div className="host-end-actions">
              <button
                id="btn-end-call-all"
                className="btn-end-for-all"
                onClick={endMeetingForEveryone}
              >
                <PhoneOff size={18} />
                <span>End call for everyone</span>
              </button>
              <button
                id="btn-just-leave"
                className="btn-just-leave"
                onClick={() => {
                  setShowHostEndDialog(false);
                  leaveMeeting();
                }}
              >
                Just leave
              </button>
              <button
                className="btn-cancel-dialog"
                onClick={() => setShowHostEndDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Captions Subtitle Overlay */}
      {isCaptionsOn && activeCaption && (
        <div className="live-captions-overlay">
          <span className="caption-sender">[{activeCaption.sender}]:</span>
          <span className="caption-text">{activeCaption.text}</span>
        </div>
      )}

      {/* Meeting Top Bar */}
      <header className="meeting-top-bar">
        <div className="meeting-info-group">
          <div className="meeting-code-pill" onClick={copyMeetingLink} title="Click to copy meeting link">
            <span>{activeRoom}</span>
            <button className="copy-mini-btn" aria-label="Copy meeting code">
              {copied ? <Check size={14} color="#81c995" /> : <Copy size={14} />}
            </button>
          </div>
          <span className="meeting-timer">
            <Clock size={13} style={{ opacity: 0.7 }} />
            {formatElapsed(elapsedSeconds)}
          </span>

          {/* Host indicator badge */}
          {isHost && <span className="host-badge-gold">Host</span>}

          {/* Recording Status Pill */}
          {isRecording && (
            <div className="rec-pill">
              <span className="rec-dot"></span> REC
            </div>
          )}
        </div>

        <div className="meeting-top-right">
          <div className="cf-turn-pill" style={{ background: "rgba(255,255,255,0.06)", border: "none" }}>
            <Radio size={13} color="#f97316" />
            <span>Cloudflare TURN</span>
          </div>
          <div className="participant-count-badge">
            <Users size={14} />
            <span>{participantCount}</span>
          </div>
        </div>
      </header>

      {/* Main Video Stage */}
      <main
        className={`meeting-stage-wrapper ${
          isScreenSharing || pinnedPeer ? "presentation-mode" : ""
        }`}
      >
        {/* Spotlight Mode if a participant is pinned */}
        {pinnedPeer ? (
          <div className="spotlight-stage">
            <div className="spotlight-main-tile">
              {pinnedPeer === "local" ? (
                <div className={`video-tile ${isScreenSharing ? "screen-sharing-tile" : ""}`}>
                  <div className="tile-hover-actions">
                    <button
                      className="tile-pin-btn"
                      onClick={togglePictureInPicture}
                      title="Picture-in-Picture"
                    >
                      <PictureInPicture size={14} />
                    </button>
                    <button
                      className="tile-pin-btn pinned"
                      onClick={() => setPinnedPeer(null)}
                      title="Unpin video"
                    >
                      <PinOff size={15} />
                    </button>
                  </div>
                  {isVideoOff && !isScreenSharing ? (
                    <div className="avatar-tile-center">
                      <div className="tile-avatar-circle">Y</div>
                      <span style={{ fontSize: "0.9rem", color: "#9aa0a6" }}>Camera is off</span>
                    </div>
                  ) : (
                    <video
                      ref={setLocalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`video-element ${isScreenSharing ? "" : "mirror"}`}
                    />
                  )}
                  <div className="tile-name-tag">
                    <span>You (Spotlight)</span>
                    {selectedQuality === "720p" && <span className="quality-hd-tag">HD</span>}
                    <span className="mic-status-icon">
                      {isMicMuted ? <MicOff size={13} color="#ea4335" /> : <Mic size={13} color="#81c995" />}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="video-tile">
                  <div className="tile-hover-actions">
                    <button
                      className="tile-pin-btn"
                      onClick={togglePictureInPicture}
                      title="Picture-in-Picture"
                    >
                      <PictureInPicture size={14} />
                    </button>
                    <button
                      className="tile-pin-btn pinned"
                      onClick={() => setPinnedPeer(null)}
                      title="Unpin video"
                    >
                      <PinOff size={15} />
                    </button>
                    {isHost && pinnedPeer && pinnedPeer !== "local" && (
                      <>
                        <button
                          className="tile-pin-btn tile-mute-btn"
                          onClick={() => muteParticipant(pinnedPeer)}
                          title="Mute participant"
                        >
                          <VolumeX size={14} />
                        </button>
                        <button
                          className="tile-pin-btn tile-kick-btn"
                          onClick={() => kickParticipant(pinnedPeer)}
                          title="Remove participant"
                        >
                          <UserMinus size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {remoteStreams[pinnedPeer] ? (
                    <RemoteParticipantTile
                      stream={remoteStreams[pinnedPeer]}
                      index={
                        remotePeersList.findIndex(([id]) => id === pinnedPeer) !== -1
                          ? remotePeersList.findIndex(([id]) => id === pinnedPeer) + 1
                          : 1
                      }
                      isMuted={remoteMicMuted[pinnedPeer] || false}
                    />
                  ) : (
                    <div className="avatar-tile-center">
                      <div className="tile-avatar-circle" style={{ background: "#a855f7" }}>P</div>
                      <span style={{ fontSize: "0.9rem", color: "#9aa0a6" }}>Camera is off</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Side Filmstrip (Only rendered if there are other participants) */}
            {(pinnedPeer !== "local" || remotePeersList.length > 0) && (
              <div className="spotlight-strip">
                {pinnedPeer !== "local" && (
                  <div
                    className="video-tile"
                    style={{ cursor: "pointer", aspectRatio: "16/9" }}
                    onClick={() => setPinnedPeer("local")}
                    title="Click to spotlight your video"
                  >
                    <video
                      ref={setLocalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`video-element ${isScreenSharing ? "" : "mirror"}`}
                    />
                    <div className="tile-name-tag">
                      <span>You</span>
                    </div>
                  </div>
                )}

                {remotePeersList
                  .filter(([pId]) => pId !== pinnedPeer)
                  .map(([pId, rStream], idx) => (
                    <div
                      key={pId}
                      className="video-tile"
                      style={{ cursor: "pointer", aspectRatio: "16/9" }}
                      onClick={() => setPinnedPeer(pId)}
                      title={`Click to spotlight Participant ${idx + 1}`}
                    >
                      <video
                        ref={(el) => {
                          if (el && rStream) {
                            if (el.srcObject !== rStream) el.srcObject = rStream;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        className="video-element"
                      />
                      <div className="tile-name-tag">
                        <span>Participant {idx + 1}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Adaptive Grid */
          <div
            className={`video-grid ${
              participantCount === 1
                ? "peers-1"
                : participantCount === 2
                ? "peers-2"
                : participantCount <= 4
                ? "peers-4"
                : "peers-many"
            }`}
          >
            {/* Local User Tile */}
            <div className={`video-tile ${isScreenSharing ? "screen-sharing-tile" : ""}`}>
              <div className="tile-hover-actions">
                <button
                  className="tile-pin-btn"
                  onClick={togglePictureInPicture}
                  title="Picture-in-Picture"
                >
                  <PictureInPicture size={14} />
                </button>
                <button
                  className="tile-pin-btn"
                  onClick={() => setPinnedPeer("local")}
                  title="Pin to spotlight"
                >
                  <Pin size={15} />
                </button>
              </div>

              {isHandRaised && (
                <div className="hand-raised-badge">
                  <Hand size={14} /> Raised
                </div>
              )}

              {isVideoOff && !isScreenSharing ? (
                <div className="avatar-tile-center">
                  <div className="tile-avatar-circle">Y</div>
                  <span style={{ fontSize: "0.9rem", color: "#9aa0a6" }}>Camera is off</span>
                </div>
              ) : (
                <video
                  ref={setLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`video-element ${isScreenSharing ? "" : "mirror"}`}
                />
              )}

              {isScreenSharing && (
                <div className="screen-share-tag">
                  <MonitorUp size={13} />
                  <span>Your Screen</span>
                </div>
              )}

              <div className="tile-name-tag">
                <span>You {isScreenSharing ? "(Presenting)" : ""}</span>
                {selectedQuality === "720p" && <span className="quality-hd-tag">HD</span>}
                <span className="mic-status-icon">
                  {isMicMuted ? <MicOff size={13} color="#ea4335" /> : <Mic size={13} color="#81c995" />}
                </span>
              </div>
            </div>

            {/* Remote Peer Video Tiles */}
            {remotePeersList.map(([peerIdKey, stream], index) => (
              <div key={peerIdKey} className={`video-tile remote-tile-${peerIdKey}`}>
                <div className="tile-hover-actions">
                  <button
                    className="tile-pin-btn"
                    onClick={() => {
                      const v = document.querySelector(`.remote-tile-${peerIdKey} video`) as HTMLVideoElement;
                      togglePictureInPicture(v);
                    }}
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture size={14} />
                  </button>
                  <button
                    className="tile-pin-btn"
                    onClick={() => setPinnedPeer(peerIdKey)}
                    title="Pin to spotlight"
                  >
                    <Pin size={15} />
                  </button>
                  {isHost && (
                    <>
                      <button
                        className="tile-pin-btn tile-mute-btn"
                        onClick={() => muteParticipant(peerIdKey)}
                        title="Mute participant"
                      >
                        <VolumeX size={14} />
                      </button>
                      <button
                        className="tile-pin-btn tile-kick-btn"
                        onClick={() => kickParticipant(peerIdKey)}
                        title="Remove participant"
                      >
                        <UserMinus size={14} />
                      </button>
                    </>
                  )}
                </div>

                {remoteHands[peerIdKey] && (
                  <div className="hand-raised-badge">
                    <Hand size={14} /> Raised
                  </div>
                )}

                <RemoteParticipantTile
                  stream={stream}
                  index={index + 1}
                  isMuted={remoteMicMuted[peerIdKey] || false}
                />
              </div>
            ))}

            {/* Empty / Waiting State Card */}
            {remotePeersList.length === 0 && (
              <div className="waiting-partner-card">
                <div style={{ color: "var(--accent-blue)" }}>
                  <Users size={48} strokeWidth={1.5} />
                </div>
                <h3>You&apos;re the only one here</h3>
                <p style={{ fontSize: "0.9rem", maxWidth: "340px" }}>
                  Share this meeting code with anyone you want to join the call.
                </p>
                <div className="share-invite-box" onClick={copyMeetingLink} style={{ cursor: "pointer" }}>
                  <span>{typeof window !== "undefined" ? `${window.location.origin}/?room=${activeRoom}` : activeRoom}</span>
                  {copied ? <Check size={15} color="#81c995" /> : <Copy size={15} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Side Drawer: Chat / People / Info */}
        {activeDrawer && (
          <aside className="side-drawer">
            <div className="drawer-header">
              <span className="drawer-title">
                {activeDrawer === "chat" && "In-call messages"}
                {activeDrawer === "people" && `People (${participantCount})`}
                {activeDrawer === "info" && "Meeting details"}
              </span>
              <button
                className="drawer-close-btn"
                onClick={() => setActiveDrawer(null)}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Drawer Content */}
            {activeDrawer === "chat" && (
              <>
                <div className="drawer-content chat-messages-list">
                  <div style={{ fontSize: "0.75rem", color: "#9aa0a6", textAlign: "center", margin: "0.5rem 0" }}>
                    Messages can be seen only by people in the call and are deleted when the call ends.
                  </div>

                  {messages.map((msg) => (
                    <div key={msg.id} className={`chat-bubble ${msg.isMe ? "mine" : ""}`}>
                      <div className="chat-sender">
                        <span>{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="chat-text">{msg.text}</div>
                    </div>
                  ))}
                </div>

                <form className="chat-input-bar" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Send a message to everyone"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="chat-input"
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!chatInput.trim()}
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}

            {/* People Drawer Content */}
            {activeDrawer === "people" && (
              <div className="drawer-content">
                {/* Host Moderation Panel (Host Only) */}
                {isHost && (
                  <div className="host-moderation-panel">
                    <button
                      className="btn-mute-all"
                      onClick={muteAllParticipants}
                      title="Mute all attendees"
                    >
                      <VolumeX size={15} />
                      <span>Mute all</span>
                    </button>
                    <button
                      className={`btn-room-lock ${isRoomLocked ? "locked" : ""}`}
                      onClick={toggleRoomLock}
                      title={isRoomLocked ? "Unlock room" : "Lock room (Enable Waiting Room)"}
                    >
                      {isRoomLocked ? <Lock size={15} /> : <Unlock size={15} />}
                      <span>{isRoomLocked ? "Locked" : "Lock"}</span>
                    </button>
                  </div>
                )}

                <div className="participant-item">
                  <div className="p-item-left">
                    <div className="p-avatar">Y</div>
                    <div>
                      <div className="p-name">
                        You {isHost ? <span className="host-badge-gold">Host</span> : <span className="p-badge">Participant</span>}
                        {isHandRaised && <span style={{ marginLeft: "4px" }}>✋</span>}
                      </div>
                    </div>
                  </div>
                  <span className="mic-status-icon">
                    {isMicMuted ? <MicOff size={15} color="#ea4335" /> : <Mic size={15} color="#81c995" />}
                  </span>
                </div>

                {remotePeersList.map(([pId], i) => (
                  <div key={pId} className="participant-item">
                    <div className="p-item-left">
                      <div className="p-avatar" style={{ background: "#a855f7" }}>
                        P{i + 1}
                      </div>
                      <div>
                        <div className="p-name">
                          Participant {i + 1}
                          {remoteHands[pId] && <span style={{ marginLeft: "4px" }}>✋</span>}
                        </div>
                      </div>
                    </div>
                    <div className="p-item-actions">
                      <span className="mic-status-icon">
                        {remoteMicMuted[pId] ? <MicOff size={15} color="#ea4335" /> : <Mic size={15} color="#81c995" />}
                      </span>
                      {isHost && (
                        <>
                          <button
                            className="btn-kick-peer"
                            onClick={() => muteParticipant(pId)}
                            title="Mute participant"
                          >
                            <VolumeX size={14} />
                          </button>
                          <button
                            className="btn-kick-peer"
                            onClick={() => kickParticipant(pId)}
                            title="Remove participant"
                          >
                            <UserMinus size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Drawer Content */}
            {activeDrawer === "info" && (
              <div className="drawer-content">
                <h4 style={{ fontSize: "0.95rem", color: "#e8eaed", marginBottom: "0.5rem" }}>
                  Joining info
                </h4>
                <div
                  className="share-invite-box"
                  onClick={copyMeetingLink}
                  style={{ cursor: "pointer", wordBreak: "break-all" }}
                >
                  <span>{typeof window !== "undefined" ? `${window.location.origin}/?room=${activeRoom}` : activeRoom}</span>
                  {copied ? <Check size={15} color="#81c995" /> : <Copy size={15} />}
                </div>
                <button
                  className="btn-new-meeting"
                  style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
                  onClick={copyMeetingLink}
                >
                  <Copy size={16} />
                  <span>Copy joining info</span>
                </button>
                {peerId && (
                  <div style={{ marginTop: "1.25rem", fontSize: "0.75rem", color: "#9aa0a6" }}>
                    Network Peer ID: <code>{peerId}</code>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Emoji Reactions Picker Popover */}
      {showReactions && (
        <div className="reactions-popover">
          {["💖", "👍", "🎉", "👏", "😂", "🔥"].map((emoji) => (
            <button
              key={emoji}
              className="reaction-btn-option"
              onClick={() => {
                triggerReaction(emoji);
                setShowReactions(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {renderSettingsModal()}

      {/* Floating Bottom Control Dock (Google Meet Style) */}
      <footer className="meeting-dock-container">
        {/* Left Section: Time & Meeting ID */}
        <div className="dock-left">
          <span className="dock-clock">{currentTime.split(" • ")[0]}</span>
          <span className="dock-room-code">| {activeRoom}</span>
        </div>

        {/* Center Section: Core Call Controls */}
        <div className="dock-center">
          <button
            id="dock-mic-btn"
            className={`dock-btn ${isMicMuted ? "muted" : ""}`}
            onClick={toggleMicrophone}
            title={isMicMuted ? "Turn on microphone" : "Turn off microphone"}
            aria-label="Toggle microphone"
          >
            {isMicMuted ? <MicOff size={21} /> : <Mic size={21} />}
          </button>

          <button
            id="dock-cam-btn"
            className={`dock-btn ${isVideoOff ? "danger" : ""}`}
            onClick={toggleCamera}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            aria-label="Toggle camera"
          >
            {isVideoOff ? <VideoOff size={21} /> : <VideoIcon size={21} />}
          </button>

          {/* Picture in Picture */}
          <button
            id="dock-pip-btn"
            className={`dock-btn ${isPipActive ? "active-accent" : ""}`}
            onClick={togglePictureInPicture}
            title={isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            aria-label="Toggle Picture in Picture"
          >
            <PictureInPicture size={21} />
          </button>

          {/* Live Closed Captions */}
          <button
            id="dock-captions-btn"
            className={`dock-btn ${isCaptionsOn ? "active-accent" : ""}`}
            onClick={toggleCaptions}
            title={isCaptionsOn ? "Turn off captions" : "Turn on captions (CC)"}
            aria-label="Toggle live captions"
          >
            {isCaptionsOn ? <Captions size={21} /> : <CaptionsOff size={21} />}
          </button>

          {/* Emoji Reactions */}
          <button
            id="dock-reactions-btn"
            className={`dock-btn ${showReactions ? "active-accent" : ""}`}
            onClick={() => setShowReactions(!showReactions)}
            title="Send reaction"
            aria-label="Send reaction"
          >
            <Smile size={21} />
          </button>

          {/* Screen Share */}
          <button
            id="dock-screen-btn"
            className={`dock-btn ${isScreenSharing ? "active-accent" : ""}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop presenting" : "Present now (Screen Share)"}
            aria-label="Toggle screen share"
          >
            {isScreenSharing ? <MonitorOff size={21} /> : <MonitorUp size={21} />}
          </button>

          {/* Raise Hand */}
          <button
            id="dock-hand-btn"
            className={`dock-btn ${isHandRaised ? "active-accent" : ""}`}
            onClick={toggleHandRaise}
            title={isHandRaised ? "Lower hand" : "Raise hand (✋)"}
            aria-label="Raise hand"
          >
            <Hand size={21} />
          </button>

          {/* Call Recording */}
          <button
            id="dock-record-btn"
            className={`dock-btn ${isRecording ? "danger" : ""}`}
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Record meeting"}
            aria-label="Record meeting"
          >
            {isRecording ? <Square size={20} /> : <CircleDot size={20} />}
          </button>

          {/* Leave Call */}
          <button
            id="dock-leave-btn"
            className="dock-btn-leave"
            onClick={() => {
              if (isHost && remotePeersList.length > 0) {
                setShowHostEndDialog(true);
              } else {
                leaveMeeting();
              }
            }}
            title="Leave call"
            aria-label="Leave call"
          >
            <PhoneOff size={22} />
          </button>
        </div>

        {/* Right Section: Drawers & Details */}
        <div className="dock-right">
          <button
            id="dock-settings-btn"
            className="dock-icon-btn"
            onClick={() => {
              refreshDevices();
              setShowSettings(true);
            }}
            title="Audio & Video Settings"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>

          <button
            id="dock-info-btn"
            className={`dock-icon-btn ${activeDrawer === "info" ? "active" : ""}`}
            onClick={() => setActiveDrawer(activeDrawer === "info" ? null : "info")}
            title="Meeting details"
            aria-label="Meeting details"
          >
            <Info size={20} />
          </button>

          <button
            id="dock-people-btn"
            className={`dock-icon-btn ${activeDrawer === "people" ? "active" : ""}`}
            onClick={() => setActiveDrawer(activeDrawer === "people" ? null : "people")}
            title="Show everyone"
            aria-label="Show everyone"
          >
            <Users size={20} />
            <span className="dock-badge-count">{participantCount}</span>
          </button>

          <button
            id="dock-chat-btn"
            className={`dock-icon-btn ${activeDrawer === "chat" ? "active" : ""}`}
            onClick={() => {
              setActiveDrawer(activeDrawer === "chat" ? null : "chat");
              setUnreadCount(0);
            }}
            title="Chat with everyone"
            aria-label="Chat with everyone"
          >
            <MessageSquare size={20} />
            {unreadCount > 0 && <span className="dock-badge-count">{unreadCount}</span>}
          </button>
        </div>
      </footer>
    </div>
  );
}

// Sub-component for remote participant video tile (memoized to prevent re-renders on timer ticks)
const RemoteParticipantTile = memo(function RemoteParticipantTile({
  stream,
  index,
  isMuted,
}: {
  stream: MediaStream;
  index: number;
  isMuted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />

      <div className="tile-name-tag">
        <span>Participant {index}</span>
        <span className="mic-status-icon">
          {isMuted ? <MicOff size={13} color="#ea4335" /> : <Mic size={13} color="#81c995" />}
        </span>
      </div>
    </div>
  );
});
