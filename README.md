# TruthLens AI – Deepfake Image Detector

> A full-stack web application that detects whether an uploaded image is **REAL** or **AI-GENERATED (deepfake)** using a multi-layered AI detection pipeline.

---

## 🏗️ Architecture

```
User Upload → React (3000) → Node.js/Express (5000) → Python FastAPI (8000)
                                    ↓                          ↓
                               MongoDB (27017)           Hive AI API
                                    ↓                    HF ViT Model
                            Gemini API (reasoning)       Fallback Stats
```

### Tech Stack

| Layer        | Technology                     | Port |
|--------------|-------------------------------|------|
| Frontend     | React 18 + Axios              | 3000 |
| Backend      | Node.js + Express + Multer    | 5000 |
| AI Service   | Python FastAPI + Uvicorn      | 8000 |
| Database     | MongoDB (local)               | 27017|

### AI Detection Cascade

1. **Hive AI API** (primary) – Free, cloud-based deepfake detector
2. **Hugging Face ViT** (fallback) – Local `Wvolf/ViT-Deepfake-Detection` model
3. **Statistical Fallback** – Basic texture analysis (always available, demo only)

### Reasoning Layer

- **Google Gemini 1.5 Flash** (free, 1500 req/day) – generates human-readable explanations
- **Rule-based fallback** – pre-written explanations if Gemini is not configured

---

## 📦 Project Structure

```
truthlens-ai/
├── frontend/                 React app
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── Header.js / .css
│   │       ├── UploadSection.js / .css
│   │       ├── ResultCard.js / .css
│   │       ├── HistoryPanel.js / .css
│   │       └── Footer.js / .css
│   └── package.json
│
├── backend/                  Express API server
│   ├── server.js
│   ├── .env                  ← Fill in your API keys
│   ├── uploads/              ← Uploaded images stored here
│   ├── package.json
│   └── src/
│       ├── config/database.js
│       ├── controllers/
│       │   ├── analyzeController.js
│       │   └── historyController.js
│       ├── middleware/
│       │   ├── multerConfig.js
│       │   └── errorHandler.js
│       ├── models/Result.js
│       └── routes/
│           ├── analyze.js
│           └── history.js
│
├── ai-service/               Python FastAPI service
│   ├── main.py
│   ├── requirements.txt
│   └── .env                  ← Add Hive API key
│
└── README.md
```

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js** v18+ – https://nodejs.org/
- **Python** 3.9+ – https://www.python.org/
- **MongoDB Community** – https://www.mongodb.com/try/download/community
- **npm** (comes with Node.js)
- **pip** (comes with Python)

---

### Step 1: Install MongoDB

1. Download MongoDB Community Server from the link above
2. Install with default settings
3. MongoDB will run as a Windows service automatically
4. Verify: open a terminal and run `mongosh` — you should see a `>` prompt

---

### Step 2: Add API Keys

#### Get Hive AI API Key (Free – Recommended)
1. Go to https://thehive.ai/
2. Sign up for a free account
3. Navigate to API Keys → Create New Key
4. Copy the key

#### Get Google Gemini API Key (Free)
1. Go to https://aistudio.google.com/
2. Sign in with Google
3. Click "Get API key" → Create API key
4. Copy the key

#### Set the Keys

Edit `backend/.env`:
```
HIVE_API_KEY=your_actual_hive_key_here
GEMINI_API_KEY=your_actual_gemini_key_here
```

Edit `ai-service/.env`:
```
HIVE_API_KEY=your_actual_hive_key_here
```

> **Note:** The app works WITHOUT API keys using fallback logic. Results will be demo-quality, not production-accurate.

---

### Step 3: Install Dependencies

Open **three separate terminal windows**:

#### Terminal 1 – Frontend
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\frontend"
npm install
```

#### Terminal 2 – Backend
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\backend"
npm install
```

#### Terminal 3 – AI Service
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\ai-service"
pip install -r requirements.txt
```

---

### Step 4: Run the Project

Start all three services (keep all terminals open):

#### Terminal 1 – Frontend (React)
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\frontend"
npm start
```
→ Opens at http://localhost:3000

#### Terminal 2 – Backend (Express)
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\backend"
npm run dev
```
→ Runs at http://localhost:5000

#### Terminal 3 – AI Service (Python)
```powershell
cd "d:\sem 4\PBL\TURTHLENS AI FINAL\ai-service"
python main.py
```
→ Runs at http://localhost:8000
→ API docs at http://localhost:8000/docs

---

## 🔌 API Reference

### POST /api/analyze
Upload an image for deepfake detection.

**Request:** `multipart/form-data`
- Field: `image` (file)

**Response:**
```json
{
  "_id": "65a1b2c3d4e5f6789012345",
  "imageName": "portrait.jpg",
  "prediction": "FAKE",
  "confidence": 87.5,
  "risk": "HIGH",
  "reasoning": "This image shows clear signs of AI generation...",
  "modelUsed": "Hive AI Deepfake Detection API",
  "createdAt": "2026-04-28T16:00:00.000Z"
}
```

### GET /api/history
Get paginated analysis history.

**Query params:** `page=1&limit=10`

**Response:**
```json
{
  "results": [...],
  "total": 42,
  "page": 1,
  "totalPages": 5,
  "limit": 10
}
```

### DELETE /api/history/:id
Delete a specific result.

### GET /api/health
Backend health check.

---

## 🧠 Risk Level Logic

| Prediction | Confidence | Risk Level |
|-----------|-----------|-----------|
| FAKE      | > 80%     | 🔴 HIGH   |
| FAKE      | 50–80%    | 🟡 MEDIUM |
| FAKE      | < 50%     | 🟢 LOW    |
| REAL      | Any       | 🟢 LOW    |

---

## 🔧 Troubleshooting

### "MongoDB connection failed"
- Ensure MongoDB is installed and running
- Run: `net start MongoDB` in PowerShell (as Admin)
- Or start manually: `mongod --dbpath C:\data\db`

### "AI service not reachable"
- The backend falls back to a demo result automatically
- Start the Python service: `python main.py` in `ai-service/`

### "Module not found" errors (Python)
```powershell
pip install -r requirements.txt
```

### "npm install" errors
```powershell
npm cache clean --force
npm install
```

### Port already in use
```powershell
# Find and kill the process on port 5000
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

---

## 🎓 Project Notes

- This is a **student PBL project** demonstrating real-world system architecture
- No model training is claimed — pre-trained models and APIs are used
- The Hive AI API provides the most accurate results
- Gemini generates contextual explanations of the detection results
- All data is stored locally — no cloud deployment required

---

## 📄 License

MIT – Free to use for educational purposes.
