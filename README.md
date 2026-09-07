# HireReady — AI-Powered Technical & Behavioral Interview Trainer

<div align="center">

![HireReady Banner](https://raw.githubusercontent.com/Sayan-stg/hire-ready/main/ai%20interview%20trainer/frontend/favicon.svg)

### *Master the Interview. Before It Happens.*
An intelligent, voice-first simulation platform engineered to replicate authentic FAANG and high-growth startup technical interview loops.

[![Live Deployment](https://img.shields.io/badge/Live%20Demo-Render-5fd4d9?style=flat-square)](https://thefifthbit.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Security](https://img.shields.io/badge/Security-Audited%20%26%20Isolated-success?style=flat-square)](#-security--api-isolation)
[![Team](https://img.shields.io/badge/Developed%20By-Sixth%20Bit-6f7fae?style=flat-square)](#)

[**Explore Live Demo ?**](https://thefifthbit.onrender.com) · [**Report Issue**](https://github.com/Sayan-stg/hire-ready/issues) · [**Setup Guide**](#-quickstart-guide)

</div>

---

## ?? Key Highlights & Capabilities

### 1. ?? Pre-Interview Mission Calibration (Setup Modal)
Never jump into an uncalibrated session. HireReady launches an interactive configuration dashboard before every interview:
- **Track Selection:** Choose between **??? Verbal Architecture & Systems** or **?? Live Coding Sandbox**.
- **Role Alignment:** SDE-2, Senior Software Engineer (Lead), Staff Distributed Architect, Frontend, Backend, Full Stack, AI/ML Engineer, DevOps/SRE, or Product Manager.
- **Difficulty Curves:** Foundational (Easy / Junior), Production (Medium / Mid-Level), or Staff / Extreme (Hard).
- **Interview Rounds:** System Architecture & Scale, Data Structures & Algorithms, Behavioral (STAR Method), or Full-Loop Comprehensive.

### 2. ? Pressure Mode (Stress-Testing Protocol)
Transform the interviewer persona from supportive to skeptical and demanding:
- **Real-Time Interruptions:** Flags over-verbosity and answers that lack depth.
- **Skeptical Probing:** Actively challenges assumptions (*"Wait, that won't scale past 20k QPS under sustained write pressure—why not X?"*).
- **Dynamic Switching:** Can be toggled on-the-fly mid-session via the topbar or set as a default preference.

### 3. ?? Live Code Sandbox & Algorithmic Evaluator
- Integrated multi-language code sandbox supporting **Python 3**, **JavaScript (ES6)**, **C++ (20)**, **Java 17**, and **Go 1.22**.
- **`? Submit Code for AI Critique`**: Sends source code directly to Google Gemini for:
  - Theoretical & Practical Time Complexity ($O(N)$, $O(N \log N)$)
  - Space Overhead & Memory Allocation
  - Edge-case vulnerability analysis (concurrency races, overflow, empty buffers)
  - Algorithmic counter-probes

### 4. ??? Voice-First Telemetry Engine
- Native browser **Web Speech API** integration for bidirectional, zero-latency speech-to-text transcription and natural voice readout.
- Animated multi-harmonic orbital waveform visualizer responding dynamically to speech cadence.

### 5. ?? Real-Time Speech & Integrity Diagnostics
- **Pace Analysis:** Instantaneous Words Per Minute (WPM) tracking.
- **Filler Word Detection:** Real-time highlighting of verbal micro-hesitations (`um`, `uh`, `like`, `basically`, `actually`, `you know`).
- **Integrity Telemetry:** Monitored tab-switch detection, clipboard paste tracking, and active session duration logging.

### 6. ?? Multi-Dimensional Scorecards & Leaderboards
- Post-session evaluation breaking down **Technical Accuracy**, **Communication & Articulation**, **System Trade-offs**, and **STAR Behavioral Adherence**.
- Global matrix leaderboard ranking candidates by percentile.

---

## ??? Technical Architecture

```
[ Candidate Browser ]
       ¦  (Web Speech API for audio synthesis/STT; zero third-party client leaks)
       ¦  (Session tokens via HttpOnly headers)
       ?
[ Node.js / Express Gateway (Port 5000) ]
       ¦  +-- Security: Helmet HTTP Headers & CORS restrictions
       ¦  +-- Protection: IP Rate-Limiting (express-rate-limit)
       ¦  +-- Middleware: JWT Authentication & User Verification
       ¦  +-- Fallback: In-memory session store (operates even if DB is offline)
       ?
[ Google Gemini Generative AI API (models/gemini-3.5-flash-lite) ]
       ¦  (Server-to-Server encrypted proxy; credentials never exposed)
       ?
[ MongoDB Database ]
       (User accounts, encrypted credentials via bcrypt, past session telemetry)
```

---

## ?? Security & API Isolation

A comprehensive white-box security audit was completed on this codebase:
- **Client-Side Isolation:** Zero upstream keys (Gemini, OpenAI, Anthropic) exist in client-side HTML, CSS, or JS.
- **Backend Proxying:** All LLM communications are strictly mediated through server-side Express routes (`/api/interview/*`).
- **Secret Protection:** Strict `.gitignore` configurations protect `.env`, `config.json`, and deployment secrets from being staged.
- **Input Sanitization:** Stored and reflected DOM transcript elements undergo HTML entity escaping to prevent cross-site scripting (XSS).

---

## ?? Repository Structure

```
hire-ready/
+-- .gitignore                         # Root secret and environment exclusion rules
+-- README.md                          # Project documentation and guide
+-- ai interview trainer/
    +-- .gitignore
    +-- backend/
    ¦   +-- middleware/
    ¦   ¦   +-- auth.js                # JWT session verification & role isolation
    ¦   +-- models/
    ¦   ¦   +-- User.js                # User identity & preference schema
    ¦   ¦   +-- Session.js             # Interview transcript & telemetry schema
    ¦   +-- routes/
    ¦   ¦   +-- auth.js                # Registration, authentication, token refresh
    ¦   ¦   +-- interview.js           # Gemini prompt builder, start, message, pressure mode
    ¦   ¦   +-- evaluation.js          # Multi-dimensional score calculation
    ¦   ¦   +-- leaderboard.js         # Peer matrix ranking algorithms
    ¦   ¦   +-- resources.js           # Curated technical interview curriculum
    ¦   ¦   +-- users.js               # Profile and telemetry preference management
    ¦   +-- server.js                  # Express backend entry point
    ¦   +-- package.json
    +-- frontend/
        +-- index.html                 # High-tech cosmic landing page
        +-- css/
        ¦   +-- main.css               # Obsidian & starlight design system
        +-- js/
        ¦   +-- api.js                 # API abstraction client, token manager, theme engine
        +-- pages/
            +-- dashboard.html         # Readiness gauge, streak, recent telemetry
            +-- interview.html         # Live simulation room (Voice feed, Sandbox, HUD)
            +-- evaluation.html        # Detailed evaluation breakdown
            +-- leaderboard.html       # Peer rankings
            +-- resources.html         # Technical guides & interview strategies
            +-- settings.html          # Mission parameters & preference toggles
            +-- login.html             # Access portal
            +-- register.html          # Candidate enrollment
```

---

## ? Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or higher)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- MongoDB (Optional — the server includes an automatic in-memory fallback for instant local evaluation)

### 1. Clone the Repository
```bash
git clone https://github.com/Sayan-stg/hire-ready.git
cd hire-ready/"ai interview trainer"/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in `ai interview trainer/backend/`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_session_key_replace_this
GEMINI_API_KEY=your_google_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017/hireready
```

> **Note:** If MongoDB is not running locally, the server will automatically launch in **Autonomous Demo Mode** using high-speed in-memory session tracking.

### 4. Start the Application
```bash
node server.js
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## ?? Engineering Team

Developed with ?? by **Sixth Bit** for modern software engineering candidates:
- **Sayan** ([@Sayan-stg](https://github.com/Sayan-stg))

---

## ?? License
This project is open-source and available under the [MIT License](LICENSE).
