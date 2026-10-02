# 🔮 GaslightGPT — The Sarcastic Oracle

> **"Mortal truths are merely adorable cosmic misunderstandings."**

**GaslightGPT** is a fictional sarcastic AI chatbot web application built with a dark futuristic aesthetic (deep obsidian, neon purple, electric blue, and glassmorphic cards). It acts as a theatrical, mischievous, all-knowing cosmic oracle that delivers absurdly confident contradictions with sharp wit and playful sarcasm.

---

## 🌟 Key Features

### 1. 🎭 The Sarcastic Oracle Persona
- **Sharp Wit & Playful Sarcasm**: Starts directly with humorous contradictions and absurd reasoning.
- **Entertaining & Fictional**: All explanations are clearly presented as comedic satire; never claims fake statistics or real institutions as facts.
- **Contextual Memory Callbacks**: Remembers earlier statements during the session and weaves callbacks into future responses (e.g. references to pets, coffee, or previous claims).

### 2. 🌐 Multi-Language Support
Automatically detects the user's language and replies in the **exact same language**:
- 🇺🇿 **Uzbek (O'zbekcha)**
- 🇬🇧 **English**
- 🇷🇺 **Russian (Русский)**
- 🇹🇷 **Turkish (Türkçe)**
- ...and others!

### 3. 🎛️ AI Control Panel (Dynamic Tuning)
Adjust the Oracle's mindset in real-time via the collapsible settings panel:
- **Sarcasm Level**:
  - `0 — Mild` (Gently amused)
  - `25 — Playful` (Witty banter)
  - `50 — Sarcastic` (Classic GaslightGPT)
  - `75 — Savage` (Ruthlessly funny roasting)
  - `100 — Oracle Mode` (Transcendent cosmic condescension)
- **Absurdity Level**:
  - `0 — Logical` (Semantic loopholes)
  - `25 — Slightly Weird` (Minor surreal twists)
  - `50 — Absurd` (Celestial noodle physics, clingy floors)
  - `75 — Completely Ridiculous` (Bizarre parallel dimensions)
  - `100 — Cosmic Nonsense` (Quantum pasta laws)
- **Response Length**:
  - `Short` (1–2 punchy sentences)
  - `Medium` (2–3 theatrical sentences)
  - `Long` (3–4 sentences of cosmic justification)

### 4. ⚡ Quick Statements (1-Click Prompts)
Clickable chips that automatically fire into the conversation:
- *“Yer yumaloq.”*
- *“2+2=4.”*
- *“Men haqman.”*
- *“AI kelajak.”*
- *“Gravity exists.”*
- *“Coffee makes me smarter.”*

### 5. 🎨 Dark Futuristic Cyber-Oracle UI
- **Animated Oracle Eye / Orb**: Pulsating glowing SVG core with contra-rotating holographic orbital rings.
- **Cosmic Starfield & Grid**: Background HTML5 canvas rendering floating neon nodes and constellations.
- **Message Controls**:
  - 📋 **Copy**: Copies response text with visual checkmark feedback.
  - 🔄 **Regenerate**: Re-generates the last response with current slider settings.
  - 🔊 **Speak (TTS)**: Web Speech API voice read-aloud with an oracle cadence.
  - 🗑️ **Wipe Memory**: Modal confirmation to clear the session conversation.
- **Sound FX**: Built-in Web Audio API synthesizer for sci-fi beeps and cosmic chords (toggleable).
- **Responsive Layout**: Tailored for both mobile and desktop screens.

### 6. 🔒 Dual-Engine Backend Architecture
- **OpenAI-Compatible Live API**: Reads `OPENAI_API_KEY` from the server environment (`.env`). Supports models like `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`, or custom OpenAI-compatible endpoints (Groq, OpenRouter, Ollama).
- **Zero Frontend Leak**: The server-side API key is never exposed to the frontend JavaScript.
- **Smart Offline Oracle Engine**: If no API key is configured or when running offline, a built-in multi-lingual sarcastic engine immediately powers the application with instant witty responses.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.10+
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### 2. Installation
Dependencies are already configured:
```bash
pip install -r requirements.txt
```

### 3. Configure API Key (Optional)
Create or edit `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=5000
HOST=127.0.0.1
```
*(If no API key is provided, the application runs on the built-in offline Oracle Matrix engine seamlessly!)*

### 4. Start the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧪 Running Tests
To run the automated test suite verifying language detection, status endpoints, and persona responses across Uzbek, Russian, Turkish, and English:
```bash
python test_app.py
```

---

## 📁 Project Structure

```
parodiya nomlar/
├── app.py                 # Flask server + API proxy + Smart Offline Oracle Engine
├── requirements.txt       # Python dependencies (Flask, openai, python-dotenv)
├── test_app.py            # Automated test suite
├── .env.example           # Environment template
├── .env                   # Local configuration
├── templates/
│   └── index.html         # Futuristic Cyber-Oracle single page interface
└── static/
    ├── css/
    │   └── style.css      # Glassmorphism, neon styling, responsive layout
    └── js/
        ├── app.js         # Chat lifecycle, controls, sound synthesizer, TTS
        └── particles.js   # Background cosmic particle matrix canvas
```
