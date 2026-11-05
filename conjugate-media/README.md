# Conjugate Media — Standalone Social Media Control Platform

**Conjugate Media** is an independent, dedicated social media simulation platform built as a completely separate application (separate client on port `5174` and separate server on port `5002`) from **EngageIQ**. It controls virtual social media universes across **Instagram**, **Facebook**, **X (Twitter)**, and **LinkedIn**.

---

## 🔑 Shared Firebase Authentication & Email Document Keying
Conjugate Media shares the **exact same Firebase Authentication credentials** (`engageiqv1`) as EngageIQ.
- When you log in with your email/password on either platform, your account credentials and email are synchronized.
- In **Firebase Firestore**, data is stored using the **user's email as the document name** (`users/{userEmail}`).
- Under each user document:
  - `channels`: Profiles and live subscriber/follower counters for Instagram, Facebook, X, and LinkedIn.
  - `posts`: Full collection of posts categorized by platform, category (AI & Tech, Marketing, Business, etc.), post format (Reels, Carousels, Static, Text), media specs, and real-time metrics (Likes, Comments, Shares, Dislikes, Reach, Views).

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Shared Firebase                      │
│        (Auth: engageiqv1 | Firestore Database)         │
│               Firestore: users/{userEmail}             │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│       Conjugate Media        │  │           EngageIQ           │
│   (Social Control Engine)    │  │    (AI Analytics Engine)     │
│                              │  │                              │
│ • Client: Port 5174          │  │ • Client: Port 5173          │
│ • Server: Port 5002          │  │ • Server: Port 5001          │
│ • Platform Switcher on Navbar│  │ • Gemini AI Agent + ML model │
│ • Interactive Modulators     │  │ • Dynamic User Email Sync    │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## 🚀 How to Run the Applications

### Option A: Run Everything with Monorepo Scripts
From the project root:

1. **Conjugate Media Server (Port 5002)**:
   ```bash
   npm run conjugate:server
   ```
2. **Conjugate Media Frontend (Port 5174)**:
   ```bash
   npm run conjugate:client
   ```
3. **EngageIQ Backend (Port 5001)**:
   ```bash
   npm run server
   ```
4. **EngageIQ Frontend (Port 5173)**:
   ```bash
   npm run client
   ```

---

## 🎮 What You Can Do in Conjugate Media (`http://localhost:5174`)

1. **Navbar Platform Switcher**: Switch smoothly between **🌐 All Feeds**, **📸 Instagram**, **👥 Facebook**, **𝕏 X (Twitter)**, and **🔗 LinkedIn** directly from the top navigation bar.
2. **Shared Login / Register**: Log in using your EngageIQ Firebase credentials or register a new account.
3. **Channel Subscriber Controls**: Boost or reduce subscriber/follower counters with `+100`, `+1,000`, `-500` buttons.
4. **Publish Categorized Posts**: Publish posts with media specs (9:16 vertical Reels, 4:5 carousels, static images, text threads), tags, and categories (`AI & Tech`, `Marketing & Growth`, `Business & Leadership`, `Creator Economy`, etc.).
5. **Interactive Modulators**: Increase or decrease **Likes**, **Comments**, **Shares**, **Dislikes**, **Views**, and **Reach** on individual post cards.
6. **Community Comments**: Add comments with automated real-time **NLP Sentiment Scoring** (`positive`, `neutral`, `negative`).
7. **Live EngageIQ Dynamic Feedback**: Any modification in Conjugate Media immediately updates EngageIQ dashboards, timelines, sentiment analytics, and ML Ridge Regression predictions for that user email!

## 🌐 External Trending Data API

Other websites can fetch normalized trending data for one social platform from:

```text
GET http://localhost:5002/api/feed/trending-videos/:platform
```

Supported platform values are `youtube`, `instagram`, `facebook`, `linkedin`, `twitter`, and `x` (`x` is an alias for `twitter`). The response includes `success`, `timestamp`, canonical `platform`, `count`, and a `videos` array. The existing `GET /api/feed/trending-videos` endpoint continues to return all platforms.

Example:

```js
const response = await fetch('http://localhost:5002/api/feed/trending-videos/instagram');
if (!response.ok) {
  throw new Error(`Trending API failed: ${response.status}`);
}
const { videos } = await response.json();
```

The server's CORS middleware permits cross-origin requests. Replace `localhost:5002` with the deployed Conjugate Media server URL when calling this API from another website.
