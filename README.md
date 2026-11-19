# 📊 AI Data Analyst Studio

An intelligent, full-stack, mobile-responsive data analytics platform that allows business users to interact with CSV and Excel datasets through natural language chat and voice. The agent interprets business questions, writes and executes high-speed DuckDB SQL queries, performs automated data quality audits, renders publication-grade visualizations, and exports boardroom-ready executive PDF reports with a single click.

---

## ✨ Key Features

- **💬 Conversational & Voice Analytics:** Ask questions in plain English or speak into the microphone to inspect trends, aggregations, and metrics.
- **⚡ High-Speed Columnar Engine (DuckDB):** Performs zero-copy SQL queries, filtering, and pagination over in-memory datasets at C++ speed.
- **📈 Publication-Ready Visualizations:** Automatically generates and displays styled Seaborn / Matplotlib charts (bar charts, scatter plots, histograms, box plots) with click-to-zoom and PNG download.
- **🔍 Automated Data Health Audit:** Instant data quality score (0–100%), missing cell calculations, duplicate record detection, and $1.5\times$ IQR statistical outlier isolation.
- **🛡️ 10-Step In-Memory Undo Stack:** Perform data transformations (imputing missing values, removing outliers, dropping columns) with 1-click safe rollback.
- **📑 Boardroom PDF Synthesis:** Instantly compiles vector executive summaries with embedded high-resolution charts and conversational analysis logs using ReportLab.
- **🗑️ 1-Click Session Reset / Delete:** Clear chat logs and uploaded datasets instantly to reset the workspace.
- **📱 Responsive Full-Screen UI:** Optimized adaptive layout supporting desktops, tablets, and smartphones.

---

## 🏗️ System Architecture & Tech Stack

```
[ React 18 + Vite (SPA) ]
           │
     (REST / JSON)
           │
[ FastAPI Backend Controller ]
           │
┌──────────┴─────────────────────────┐
│ • LangGraph State Machine Loop     │
│ • DuckDB (High-Speed Columnar SQL) │
│ • Pandas (Data Manipulation)       │
│ • Seaborn & Matplotlib (Charts)    │
│ • Groq LLM (LLaMA / GPT-OSS 120B)  │
│ • ReportLab (Vector PDF Engine)    │
└────────────────────────────────────┘
```

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons | Responsive interactive SPA, voice input, theme switcher |
| **Backend API** | FastAPI (Python) | High-throughput asynchronous REST server |
| **Agent Workflow** | LangGraph & LangChain | Multi-turn memory, tool routing, self-correction |
| **Query Engine** | DuckDB & Pandas | In-memory zero-copy SQL analytics and data processing |
| **Visualization** | Seaborn & Matplotlib | High-resolution statistical chart rendering |
| **PDF Reporting** | ReportLab | Native vector PDF generation |
| **LLM Inference** | Groq (`langchain-groq`) | Sub-second AI response latency |

---

## 📁 Project Structure

```
AI-Data-Analyst/
├── backend/
│   ├── agent/
│   │   ├── chains.py        # LLM initialization and tool binding
│   │   ├── graph.py         # LangGraph state machine & memory
│   │   ├── prompts.py       # Prompt engineering rules
│   │   └── tools.py         # run_sql, run_code, clean_data, create_chart
│   ├── data_loader.py       # File parsing, DuckDB paging, automated EDA & undo
│   ├── main.py              # FastAPI endpoints (/upload, /chat, /eda, /reset, /export-report)
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Example environment template
│   └── .env                 # Local secrets (never committed to git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React view controller & UI state
│   │   ├── App.css          # Modern responsive CSS styling
│   │   └── main.jsx         # React application entry point
│   ├── package.json         # Node.js dependencies & scripts
│   └── vite.config.js       # Vite build configuration
├── .gitignore               # Strict ignore rules for secrets and temporary files
└── README.md                # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18.0 or higher
- **Groq API Key:** Free key from [console.groq.com](https://console.groq.com)

---

### 2. Clone the Repository

```bash
git clone https://github.com/Lalitmohan6376/Data-Analyst-Agent.git
cd Data-Analyst-Agent
```

---

### 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure your API key:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
     *(On Windows PowerShell: `Copy-Item .env.example .env`)*
   - Open `.env` and paste your Groq API key:
     ```env
     GROQ_API_KEY=your_actual_groq_api_key_here
     ```

4. Run the FastAPI backend:
   ```bash
   python -m uvicorn main:app --reload
   ```
   The backend API will start at: `http://127.0.0.1:8000`

---

### 4. Frontend Setup

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🔑 Environment Variable Setup

The backend relies on the following environment variable defined in `backend/.env`:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

> [!NOTE]
> `.env` is explicitly included in `.gitignore` to protect your credentials. Never commit `.env` to GitHub.

---

## 🌐 Deployment Guidelines

### Backend (Render / Railway / Fly.io)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:** Set `GROQ_API_KEY` in your hosting dashboard.

### Frontend (Vercel / Netlify / Render)
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Configuration:** Set the backend API URL in `frontend/src/App.jsx` (`const API_BASE = "https://your-backend-domain.com";`).

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
