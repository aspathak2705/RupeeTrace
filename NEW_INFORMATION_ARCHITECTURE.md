# RupeeTrace — Target Information Architecture

**Version:** 2.0  
**Design Paradigm:** Neo-Brutalist Forensic Civic Intelligence  
**Core Strategy:** 5 Primary Unified Destinations + 1 Global AI Assistant Drawer + Persistent Ward Selector + Persona Context Guard

---

## 1. High-Level Site Map

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   GLOBAL HEADER                                        │
│  [ RUPEETRACE ]    [Ward: K/E ▼]    [Role: Citizen / Officer]    [AI Assistant ⌘K]     │
├───────────────┬───────────────────┬────────────────────┬───────────────┬───────────────┤
│  1. OVERVIEW  │   2. INVESTIGATE  │  3. ACCOUNTABILITY │ 4. NEXT RUPEE │5. PUBLIC PORTAL│
└───────┬───────┴─────────┬─────────┴──────────┬─────────┴───────┬───────┴───────┬───────┘
        │                 │                    │                 │               │
        ▼                 ▼                    ▼                 ▼               ▼
 ┌─────────────┐   ┌─────────────┐      ┌─────────────┐   ┌─────────────┐ ┌─────────────┐
 │Macro Budget │   │Road Search  │      │DLP Sentinel │   │JANMAT Votes │ │File Report  │
 │Spend & Util │   │Road Passport│      │RoadLife ML  │   │Budget Sim   │ │7-Stage Track│
 │Audit Flags  │   │Money Trace  │      │Scorecards   │   │Materials    │ │Photo Compare│
 │Hero CTA ───►│   │Evidence Card│      │Tender Calc  │   │Value Brief  │ │Conflict Flag│
 └─────────────┘   └─────────────┘      └─────────────┘   └─────────────┘ └─────────────┘
```

---

## 2. Destination Specifications

### Destination 1: OVERVIEW (`/overview` or default)
- **Header Summary:** Persistent Ward selector, total budget, recorded spend, utilization meter, remaining funds.
- **Forensic Alert Banner:** Highlights active DLP breaches, repeat repairs, and unspent allocations.
- **Contractor Distribution:** Top 5 contractors by spend with reopen rates and DLP breach tags.
- **Hero Call-to-Action:** High-contrast Neo-Brutalist button: **"START INVESTIGATION ->"**, deep-linking directly into Destination 2 with high-risk road pre-selected.

### Destination 2: INVESTIGATE (`/investigate`)
- **Unified Road Search:** Auto-complete search by Road ID (`RD0140`) or Name (`Marol Maroshi Rd`).
- **View Mode Switcher:**
  - **Mode A: Road Passport** (Sticky 5-chapter navigation: Overview, Technical Specs, DLP & Warranty, History & Complaints, Audit Provenance).
  - **Mode B: Visual Money Trace Graph** (Force-directed graph with progressive disclosure, node filtering, right-side slide-out Entity Inspector).
  - **Mode C: Structured Forensic Table** (Tabular ledger for data-focused analysis).
- **Work Order Evidence Modal:** Deep-linked modal displaying rate card validation, asphalt mix rates, and contractor invoice provenance.

### Destination 3: ACCOUNTABILITY (`/accountability`)
- **DLP Sentinel:** High-priority triage board for defect liability violations.
- **RoadLife Durability Intel:** Early failure predictions, repeat repair recurrence intervals, and monsoon survival metrics.
- **Contractor Scorecard Matrix:** Comprehensive rating of all 8 empaneled contractors (Quality, SLA compliance, Reopen rate, Overbilling history).
- **Tender Advisor Workspace:** Interactive QCBS tender simulation modeling quality-to-cost tradeoffs.
- *(Officer Demonstration Controls: Administrative flags, recovery notice dispatches, score weight sliders).*

### Destination 4: NEXT RUPEE (`/next-rupee`)
- **JANMAT Participatory Budgeting:** Citizen-prioritized civic proposals with 8-dimension impact scores.
- **Civic Budget Simulator:** Interactive Knapsack optimizer (allocate ₹50L, ₹1Cr, ₹2Cr) maximizing durability, safety, and equity.
- **Material & Cost Intelligence:** Engineering alternatives (IRC:SP:98, MoRTH) showcasing cost savings and durability improvements.
- **13-Point Civic Value Decision Brief:** Exportable summary synthesizing participatory input and technical evidence.

### Destination 5: PUBLIC PORTAL (`/portal`)
- **Citizen Report Filing:** Clean, accessible pothole and drainage reporting form.
- **7-Stage Verification Tracker:** Real-time visibility into repair lifecycles (Sanctioned -> Materials -> In Progress -> Citizen Verification -> Closed).
- **Before & After Visual Inspection:** Side-by-side photographic comparison for citizens to confirm repair authenticity.
- **Community Discrepancy Alerting:** Flag fraudulent or substandard repairs to block contractor payout until independent re-inspection.

---

## 3. Global Supporting Primitives

1. **AI Assistant Drawer:** A single slide-over drawer accessible anywhere via `Ctrl+K` or header button. Contextually aware of active Ward, Road, or Work Order.
2. **Work Order Evidence Modal:** Accessible across all views via work order badges (`WO-KE-2025-0042`).
3. **Neo-Brutalist Design Tokens:**
   - Background: `#F8F9FA` / `#FFFFFF`
   - Primary Ink: `#121316`
   - Accent Yellow: `#FFDE59`
   - Safety Emerald: `#00C853`
   - Alert Crimson: `#FF3B30`
   - Borders: `3px solid #121316`
   - Shadows: `4px 4px 0px #121316`
