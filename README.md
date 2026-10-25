# StudyMate AI 🎓
> **Make every study session count.**
> *Turn confusing topics into clear ideas, dense notes into essentials, and curiosity into confidence.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![AI Model](https://img.shields.io/badge/AI-Gemma%204%20(26B%20A4B%20IT)-purple.svg)](https://ai.google.dev/)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20HTML5%20%7C%20Vanilla%20JS-emerald.svg)](#technology-stack)

StudyMate AI is a clean, reliable, and high-performance educational web application built with **Node.js, Express.js, and Vanilla JavaScript**, powered by **Gemma 4 26B A4B IT** through the official `@google/genai` SDK.

Designed specifically for students and hackathon demonstrations, StudyMate AI eliminates cognitive overload, prevents AI hallucination in study notes, and provides active recall testing with instant quiz grading.

---

## 🚀 Three Core Features

### 1. Explain a Topic
- **Inputs**: Topic name, optional academic subject, and difficulty level (**Beginner**, **Intermediate**, **Advanced**).
- **Educational Outputs**:
  - Clear, accessible definition
  - Core concepts and theoretical principles
  - Step-by-step breakdown (3 to 5 logical steps)
  - Practical everyday examples & analogies
  - Real-world applications in technology/industry
  - High-yield key takeaways for exam revision

### 2. Summarize Study Notes
- **Inputs**: Study notes pasted into a clean text area with summary style selection (**Concise**, **Detailed**, **Exam Preparation**).
- **Factual Grounding**: Strictly constrained to the student's submitted notes. Never fabricates absent facts; clearly highlights where source text lacks detail.
- **Educational Outputs**:
  - Main ideas and theme overview
  - Important definitions explicitly defined in the notes
  - Key points in structured bullet form
  - Important facts to remember
  - Short revision summary for quick pre-exam review

### 3. Generate a 5-Question Quiz
- **Input**: Topic name.
- **Interactive Test Runner**:
  - Generates exactly 5 non-duplicate multiple-choice questions with 4 answer options each.
  - Interactive option selection with prevention of accidental duplicate submissions.
  - Progress tracker showing answered questions (e.g. `Answered: 5 / 5`).
  - Instant scoring with percentage badge, correct/incorrect count, and score-tailored motivational feedback.
  - Full diagnostic review: correct answers highlighted in green, mistakes flagged in red, and step-by-step educational explanations revealed.
  - "Retry This Quiz" and "Create New Quiz" buttons.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Fast, zero-bundle overhead, fully responsive)
- **Backend**: Node.js & Express.js
- **AI SDK**: Official Google GenAI TypeScript/JavaScript SDK (`@google/genai`)
- **Verified AI Model**: `gemma-4-26b-a4b-it` (Gemma 4 26B A4B IT)
- **Environment**: Root-level `.env` loaded via `dotenv`

---

## 📁 Project Structure

```
studymate-ai/
├── public/
│   ├── index.html       # Clean semantic HTML5 single-page application
│   ├── style.css        # Modern responsive CSS (Navy typography, purple-blue gradients)
│   └── script.js        # Vanilla JavaScript with guaranteed error handling
├── server.js            # Express backend with Gemma 4 integration & root .env resolution
├── package.json         # Project metadata and dependencies
├── .env.example         # Environment variables template
├── .gitignore           # Ignores .env and node_modules
├── LICENSE              # MIT Open-Source License
└── README.md            # Complete documentation
```

---

## 🔧 Resolved Development Problems

This implementation specifically resolves four common issues encountered in AI study tools:

| Issue | Root Cause | Solution Implemented |
| :--- | :--- | :--- |
| **Problem A: Gemini Not Configured** | `dotenv` defaulted to `process.cwd()`, failing when launched from subdirectories. | In `server.js`, explicitly resolved the path to root `.env`: `dotenv.config({ path: path.resolve(__dirname, '.env') })`. |
| **Problem B: "Something went wrong"** | Mismatched endpoints and unhandled exceptions returned empty or opaque strings. | Unified API response schema (`{ success: true/false, error, details, guidance }`) with clear status codes (400, 401, 404, 429, 500). |
| **Problem C: Malformed JSON Crash** | Model returned markdown fences, trailing commas, or truncated JSON in quiz generation. | Multi-stage self-healing parser (`parseQuizResponse`) strips code fences, repairs trailing commas, balances brackets, and includes a regex fallback extractor. |
| **Problem D: Persistent Loading State** | If an API request failed or timed out, buttons remained stuck on "Gemma 4 is Explaining...". | Wrapped all client requests in `try / catch / finally` where the `finally` block **guarantees** that loading spinners are hidden and buttons re-enabled. Added 30-second `AbortController` timeouts. |

---

## ⚙️ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js** v18.0.0 or higher
- **Google AI Studio API Key** (Free from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/studymate-ai.git
cd studymate-ai

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Open `.env` in any text editor and paste your API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemma-4-26b-a4b-it
PORT=3000
```

### 4. Start the Application
```bash
npm run dev
# or
npm start
```

Open your browser at:
```
http://localhost:3000
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & model status | None |
| `POST` | `/api/explain` | Explain academic topic | `{ "topic": "Photosynthesis", "subject": "Biology", "level": "Beginner" }` |
| `POST` | `/api/summarize` | Summarize study notes | `{ "notes": "...", "style": "Detailed" }` |
| `POST` | `/api/quiz` | Generate 5-question test | `{ "topic": "Operating Systems Deadlocks" }` |

---

## 🧪 Testing the Application

1. **Syntax Check**:
   ```bash
   node --check server.js
   ```
2. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```
3. **Test Explain**:
   ```bash
   curl -X POST http://localhost:3000/api/explain -H "Content-Type: application/json" -d '{"topic":"Mitosis","level":"Beginner"}'
   ```
4. **Test Quiz**:
   ```bash
   curl -X POST http://localhost:3000/api/quiz -H "Content-Type: application/json" -d '{"topic":"Newton Laws"}'
   ```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
Built with Google Gemma 4 for accessible, high-integrity education.
