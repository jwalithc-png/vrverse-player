# VRVerse Player 🌌

A production-ready, cross-platform VR Video Player application. Transform standard 2D videos into immersive VR (180° or 360°) right in your browser.

## Features ✨

- **Upload & Manage Videos**: Fast uploads with automatic metadata extraction and thumbnail generation. Max upload size configurable (default 500MB).
- **Multiple VR Modes**: 
  - Normal Player (Standard 2D)
  - VR 180° (Front-facing immersive projection)
  - VR 360° (Full equirectangular immersive projection)
- **Advanced Conversion Pipeline**: Multi-threaded FFmpeg backend. Asynchronous job queue for background processing.
- **Custom 3D WebGL Player**: Built with Three.js. Supports:
  - Equirectangular, Fisheye, Hemisphere, CubeMap, and Perspective projections
  - Mouse/Touch drag to look around
  - Scroll/Pinch to zoom (FOV control)
  - Double tap to skip backward/forward
- **Premium UI/UX**: Dark mode by default with stunning glassmorphism design, fluid animations (Framer Motion), and responsive layouts.
- **Modular Architecture**: "Plugin-ready" pipeline designed to support future AI models (Depth Estimation, NeRF, etc.) without altering core logic.

## Tech Stack 🛠️

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Three.js, React Router
- **Backend**: Node.js, Express, TypeScript, fluent-ffmpeg (with static binaries bundled), better-sqlite3
- **Database**: SQLite (Zero config required)

## Installation & Setup 🚀

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- OS: Windows, macOS, or Linux. 

*(Note: FFmpeg is statically bundled via `@ffmpeg-installer/ffmpeg`, so you do not need to install it on your OS manually).*

### 1. Clone & Install
```bash
# Clone the repository (or copy the folder)
cd vrverse-player

# Install all dependencies (Workspace, Client, Server)
npm install
npm run client:install
npm run server:install
```
*(You can also simply run `npm install` inside both `/client` and `/server` folders manually).*

### 2. Run the Application
The project uses `concurrently` to run both the frontend and backend with a single command.

```bash
# Start both dev servers
npm run dev
```

- **Frontend (Vite)**: `http://localhost:5173`
- **Backend (Express)**: `http://localhost:3001`

### 3. Production Build
```bash
# Build both client and server
npm run build

# Start the compiled server
npm start
```
*(In production, you'll need to configure Express to serve the built static Vite files from `client/dist`, or use a reverse proxy like Nginx).*

## Future AI Integration 🤖

The conversion pipeline is built around a `ConversionPlugin` interface (`server/src/converter/plugins/PluginInterface.ts`). 
Currently, it uses the `GeometricPlugin` (FFmpeg v360 filters). 

To add AI Depth Estimation or NeRF in the future:
1. Create a new class implementing `ConversionPlugin`.
2. Register it in `Pipeline.ts`.
3. Set its `priority` lower than the Geometric fallback. The system will automatically route jobs to your AI plugin if it `canHandle` the request.

## System Notes
This build has been specifically optimized for systems with:
- AMD Ryzen / Multi-core CPUs (FFmpeg uses 8 threads)
- Limited C: drive storage (Runs entirely from D: drive, temp files auto-cleaned)
- Integrated GPUs (Three.js WebGL used instead of heavy GPU encoding)
