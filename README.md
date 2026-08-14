# Study Smart

An AI-powered, interactive learning canvas that lets you explore concepts visually. By interacting with a dynamic mind map, you can ask custom questions, request deeper explanations, and generate tailored study material in real-time.

## Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, React Flow
- **Backend**: Python, FastAPI, SQLModel, PostgreSQL (via pg8000)
- **AI Integration**: OpenAI GPT-4

## Features
- 🧠 **Dynamic Concept Canvas**: Build an infinite, interconnected web of topics as you explore.
- 🤖 **AI Tutoring**: Select any node and ask AI to explain it in different depths (ELI5, detailed, etc.) or ask custom questions.
- 🎨 **Modern Cyberpunk Aesthetics**: A beautiful, distraction-free interface.
- 💾 **Session Management**: Automatically saves your layouts and nodes per session.

## Getting Started

### Backend Setup
1. Navigate to the `/backend` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in your `OPENAI_API_KEY` and `POSTGRES_URL`.
4. Run the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
