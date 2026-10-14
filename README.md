# OrbitMeet - Professional Google Meet Alternative

A high-performance, real-time video conferencing application inspired by **Google Meet**, built with **Next.js 16**, **WebRTC**, and **Cloudflare Anycast TURN**.

---

## ⚡ Architecture & Networking

- **P2P + Cloudflare Anycast TURN**: WebRTC audio, video, and data channels with automatic Cloudflare Anycast TURN relay fallback across strict firewalls and symmetric NATs.
- **Dynamic Credential Generation**: Next.js server route (`/api/turn`) securely generates time-limited Cloudflare TURN credentials on demand using your Cloudflare API token.
- **Matchmaking & Rooms**: Lightweight Next.js API route (`/api/match`) for instant group rooms and pairing.

---

## 🚀 Key Features

### 1. 🎥 Google Meet Lobby ("Green Room")
- **Live Device Preview**: Preview your webcam video and test your microphone before entering the call.
- **Pre-Join Toggles**: Enter the meeting muted or with camera turned off.
- **Instant Meeting**: Generate clean Google Meet-style codes (`abc-defg-hij`) with one click.
- **Code or URL Join**: Paste a code or complete invite link with `Enter` support.

### 2. 🎛️ In-Call Experience
- **Adaptive Video Grid**: Dynamically scales layout (1 spotlight, 2 side-by-side, 3–4 grid, 5+ auto-fit).
- **Off-Camera Avatars**: Clean colored avatar circle with initials when camera is off.
- **Active Speaker Highlight**: Subtle green glow border and microphone status indicators.
- **Presentation / Screen Sharing Mode**: Presents your screen in full spotlight while participants dock neatly into a sidebar filmstrip.

### 3. ✋ Hand Raise System
- Click the **Hand** button to raise or lower your hand.
- Displays a glowing yellow hand badge on your video tile and in the **People** drawer.
- Broadcasts real-time hand-raise notifications to all participants.

### 4. 🎉 Floating Emoji Reactions
- Click the **Smile** button to choose from live reactions: `💖`, `👍`, `🎉`, `👏`, `😂`, `🔥`.
- Floating emoji particles rise up the screen and broadcast in real time to all peers.

### 5. 📌 Pin to Spotlight
- Hover over any participant (or yourself) and click the **Pin** icon to focus that video tile as the main stage.

### 6. 💬 Live Closed Captions (Speech-to-Text)
- Toggle **CC** in the bottom dock to enable live speech-to-text captions.
- Real-time subtitles appear at the bottom of the video stage and broadcast across the room.

### 7. ⏺️ Meeting Recording
- Click **Record** to record the meeting video and audio locally using the browser `MediaRecorder` API.
- Blinking red `● REC` indicator in the header.
- Automatically compiles and downloads `OrbitMeet-Recording-[timestamp].webm` when stopped.

### 8. 💬 In-Meeting Real-Time Chat
- Slide-in side drawer for live text messaging over WebRTC data channels.
- Unread message badge counter.

### 9. ⚙️ Audio & Video Settings Modal
- Select specific microphone and camera devices (`MediaDeviceInfo`).
- Cloudflare Anycast network status verification.

---

## 🛠️ Quick Start

```bash
# Install dependencies
npm install

# Run local Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⛅ Deploying to Cloudflare Workers

OrbitMeet is configured with **`@opennextjs/cloudflare`** to run natively on the Cloudflare edge network.

### 1. Preview locally with Wrangler Edge Runtime
```bash
npm run preview
```

### 2. Configure Cloudflare Secrets
Set your Cloudflare TURN credentials in your Cloudflare Worker environment:
```bash
npx wrangler secret put CLOUDFLARE_TURN_KEY_ID
npx wrangler secret put CLOUDFLARE_TURN_API_TOKEN
```

### 3. Deploy to Cloudflare Workers
```bash
npm run deploy
```
Your meeting application will build into `.open-next/worker.js` and deploy globally to Cloudflare Workers with fast edge latency and Anycast TURN relay!
