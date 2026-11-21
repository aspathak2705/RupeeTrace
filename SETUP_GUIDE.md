# RupeeTrace Setup & Installation Guide

This guide describes how to set up, configure, and run the RupeeTrace backend and frontend applications locally on Windows, macOS, or Linux.

---

## 1. Prerequisites

- **Python**: Version 3.10 or higher.
- **Node.js**: Version 18.0 or higher with npm.
- **Git**: Installed and configured.

---

## 2. Repository Cloning & Environment Setup

```bash
git clone <repository_url>
cd "Cluade Imapact Lab project"
```

### Backend Virtual Environment
```powershell
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install fastapi uvicorn pydantic pandas pytest httpx
```

### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 3. Environment Variables (Optional)

Create a `.env` file in the root directory if you wish to configure live Anthropic Claude API access:

```env
# Optional: If omitted, RupeeTrace uses its built-in deterministic multilingual grounding engine
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Backend settings
PORT=8000
API_PREFIX=/api
DATA_DIR=Claude-Impact-Labs-data-2/data
```

> **Note**: Even if `ANTHROPIC_API_KEY` is not provided, 100% of the platform, including the AI Assistant, deterministic financial engines, Road Passports, and graph visualizations, runs offline without errors.

---

## 4. Running the Services

Open two terminal sessions:

### Terminal 1: Backend Server
```powershell
python -m uvicorn rupeetrace.main:app --port 8000 --reload
```
- Health Check: `http://localhost:8000/api/health`
- Swagger Interactive Docs: `http://localhost:8000/docs`

### Terminal 2: Frontend Vite Development Server
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 5. Verification & Testing

### Run Backend Test Suite
```powershell
python -m pytest tests/ -v
```
Expected output:
- `tests/test_loader_and_validation.py` PASSED
- `tests/test_engines.py` PASSED
- `tests/test_api_endpoints.py` PASSED

### Verify Production Frontend Build
```bash
cd frontend
npm run build
```
Expected output:
- Zero TypeScript (`tsc`) compilation errors.
- Clean bundle generation in `frontend/dist/`.
