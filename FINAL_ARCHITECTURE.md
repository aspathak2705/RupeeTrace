# RupeeTrace System Architecture & Data Flow

```
                      ┌─────────────────────────────────────┐
                      │    17 Synthetic Civic Datasets      │
                      │ (Complaints, Work Orders, Roads,    │
                      │  Wards, Contractors, Rates, etc.)   │
                      └──────────────────┬──────────────────┘
                                         │
                                         ▼
                      ┌─────────────────────────────────────┐
                      │    RupeeTrace Data Ingestion &      │
                      │      Validation Engine (FastAPI)     │
                      └──────────────────┬──────────────────┘
                                         │
                                         ▼
                      ┌─────────────────────────────────────┐
                      │        Relationship Service         │
                      │ (Foreign-key resolution & caching)  │
                      └─────────┬──────────────────┬────────┘
                                │                  │
         ┌──────────────────────┼──────────────────┼──────────────────────┐
         ▼                      ▼                  ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Engine 1: Money │  │ Engine 2: Repair │  │ Engine 3: Fair   │  │ Engine 4: Next   │
│  Trail Service   │  │ Audit Service    │  │ Accountability   │  │ Rupee Planner    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │                     │
         └─────────────────────┼─────────────────────┼─────────────────────┘
                               │
                               ▼
                      ┌─────────────────────────────────────┐
                      │    Grounded AI Assistant Engine     │
                      │  (Retrieval-First + Claude LLM /    │
                      │   Deterministic Offline Fallback)   │
                      └──────────────────┬──────────────────┘
                                         │
                                         ▼
                      ┌─────────────────────────────────────┐
                      │     REST API Endpoints (/api/*)     │
                      └──────────────────┬──────────────────┘
                                         │
       ┌─────────────────────────────────┴─────────────────────────────────┐
       ▼                                                                   ▼
┌───────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
│           Public Citizen Portal           │ │         Municipal Officer Console         │
│ - Road Passport (/passport/:roadId)       │ │ - Defect Liability Notice Dispatch        │
│ - Interactive Visual Money Trace Graph    │ │ - Rate-Card Variance Review Cards         │
│ - Citizen Field Observation Logging       │ │ - Official Engineering Clarifications     │
│ - Printable QR Code Asset Inspection      │ │ - Capital Intervention Sanctions          │
└───────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

---

## Technical Stack & Modules

### Backend (Python / FastAPI)
- **`DataLoader`** (`rupeetrace/data/data_loader.py`): Parses, normalizes, and validates currency, dates, coordinates, and foreign-key mappings across 17 CSV and GeoJSON files.
- **`ValidationService`** (`rupeetrace/data/validation_service.py`): Checks column integrity, orphaned records, and duplicate IDs without silent dropping.
- **`RelationshipService`** (`rupeetrace/services/relationship_service.py`): Provides memory-indexed lookups for multi-hop graph traversals.
- **`MoneyTrailService`** (`rupeetrace/services/money_trail_service.py`): Calculates ward budget utilization, contractor billing aggregates, and reopened job spends.
- **`AuditService`** (`rupeetrace/services/audit_service.py`): Implements 4 deterministic screening checks: Rate-Card Deviations, Candidate Duplicate Work Orders, DLP Warranty Spend, and SLA/Durability Failures.
- **`AccountabilityService`** (`rupeetrace/services/accountability_service.py`): Computes 4-pillar scores with ward low-lying flood index moderation.
- **`NextRupeeService`** (`rupeetrace/services/next_rupee_service.py`): Evaluates open complaints with a 7-factor risk priority model and assigns greedy allocations.
- **`CaseService`** (`rupeetrace/services/case_service.py`): Local SQLite database managing citizen observations and officer responses.
- **`AssistantService`** (`rupeetrace/services/assistant_service.py`): Retrieval-grounded multilingual assistant with Claude API integration and deterministic offline engine.

### Frontend (React 18 / TypeScript / Tailwind CSS)
- **Vite Build System**: Sub-second HMR and optimized production bundle (<350kB gzipped).
- **Interactive SVG Canvas**: Custom force-directed canvas layout with pan, zoom, node drag, and category filters.
- **Hash-Based Router**: Deep-link support for `/passport/:roadId`, `/graph`, `/audits`, `/contractors`, `/next-rupee`, `/cases`.
- **QR Code Modal**: Real SVG QR code rendering via `qrcode.react`.
- **Dual Persona Switcher**: Instant role toggle between Citizen and Municipal Officer.
