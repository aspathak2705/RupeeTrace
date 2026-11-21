# RupeeTrace

> **"Follow the Rupee. Verify the Repair. Fund What Matters."**

RupeeTrace is an AI-powered road repair financial accountability platform developed for the **Claude Impact Labs Hackathon**. It establishes a verified, evidence-grounded trace from municipal repair budgets and citizen complaints to executed work orders, contractor accountability ratings, and prioritized capital allocations across Mumbai's 24 municipal wards.

---

## 🌟 Signature Features

1. **Public Asset / Road Passport (`/passport/:roadId`)**
   - Persistent canonical URL for every road segment.
   - Comprehensive 6-chapter breakdown: Road Identity, Citizen Complaint History, Repair History, Audit Findings, Environmental Risk Context, and Citizen/Officer Case Dialogue.
   - Real-time SVG QR code generator with printable asset tag.

2. **Visual Money Trace Graph**
   - Interactive SVG/Canvas node-link network centered on roads, work orders, or wards.
   - Pan, zoom, node drag, and category filters (`financial`, `road_asset`, `work_order`, `contractor`, `citizen`, `outcome_audit`).
   - Slide-over evidence inspector citing raw dataset files and row indexes (`source_file#source_record_id`).
   - Tabular list fallback mode for structured audits.

3. **Four Deterministic Financial Intelligence Engines**
   - **Money Trail Engine**: Reconciles ward budgets against recorded billed costs, contractor payouts, and repeated road spending.
   - **Repair Auditor**: Algorithmic screening for rate-card deviations (>20%), candidate duplicate work orders, active DLP warranty breaches, and SLA/reopening failures.
   - **Fair Accountability Engine**: Evaluates 8 contractors across 4 weighted pillars (SLA: 30%, Durability: 30%, Cost: 25%, Repeat Burden: 15%), moderated by ward low-lying flood indices.
   - **Next Rupee Planner**: Greedy budget allocation optimizing remaining monsoon repair funds against a 7-factor priority score.

4. **Evidence-Grounded Multilingual AI Assistant**
   - Retrieval-first architecture supporting **English**, **Hindi (हिन्दी)**, **Marathi (मराठी)**, and **Hinglish**.
   - Cites exact source records, distinguishes recorded figures from treasury disbursements, identifies missing evidence, and suggests actionable next steps.
   - Zero hallucination guardrails with 100% offline fallback when API keys are absent.

5. **Shared Citizen & Municipal Officer Workflow**
   - Citizens log ground observations with photo notes.
   - Municipal engineers post official clarifications, defect liability notices, and update status (`Under Review` → `Clarified` → `Action Taken` → `Resolved`).
   - Persisted via local SQLite database.

---

## 📁 Repository Structure

```text
├── Claude-Impact-Labs-data-2/data/ # 17 synthetic civic datasets
├── rupeetrace/                     # FastAPI backend architecture
│   ├── core/                       # Settings, config, provenance schemas
│   ├── data/                       # Ingestion, validation service, SQLite store
│   ├── models/                     # Strongly-typed domain entity classes
│   ├── services/                   # 4 Intelligence Engines, Graph & Assistant
│   ├── schemas/                    # Pydantic v2 API request/response models
│   ├── api/routes/                 # 8 REST routers under /api
│   └── main.py                     # App factory and lifespan state
├── frontend/                       # React 18 + TypeScript + Vite + Tailwind
│   ├── src/components/             # Evidence badges, QR modal, evidence modal, tour bar
│   ├── src/views/                  # 7 core views (Passport, Graph, Money Trail, Audits, etc.)
│   ├── src/api/client.ts           # Type-safe API client
│   └── src/App.tsx                 # Hash router and state management
├── tests/                          # Pytest test suite
└── docs/                           # Documentation and audit methodology
```

---

## 🚀 Quick Start

### 1. Backend Setup
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn rupeetrace.main:app --port 8000
```
API Documentation: `http://localhost:8000/docs`

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Application UI: `http://localhost:5173`

---

## ⚖️ Synthetic Data & Research Disclaimer

All data utilized by RupeeTrace is synthetic and generated for the Claude Impact Labs hackathon. It does not represent actual Brihanmumbai Municipal Corporation (BMC) financial disbursements or verified physical site inspection outcomes. Billed costs represent recorded figures from synthetic work orders, not verified treasury transactions.
