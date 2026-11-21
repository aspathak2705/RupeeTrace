# RupeeTrace — Current Feature Inventory & Assessment

**Version:** 2.0  
**Scope:** Complete Component, View, and Endpoint Inventory

---

## 1. Feature-by-Feature Matrix

| Feature Name | Component Path | Backend API Endpoint | Data Source / Engine | Current Status | Redesign Decision & Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ward Financial Summary Cards** | `views/WardMoneyTrailView.tsx` | `GET /api/wards/{ward_code}/money-trail` | `wards.csv`, `work_orders.csv` (Money Trail Engine) | Connected & Functional | **Consolidate into Destination 1 (Overview)**. High-contrast Neo-Brutalist cards with clear delta indicators. |
| **Ward Contractor Spend Table** | `views/WardMoneyTrailView.tsx` | `GET /api/wards/{ward_code}/money-trail` | `work_orders.csv`, `contractors.csv` | Connected & Functional | **Consolidate into Destination 1 (Overview)**. Add inline link to Contractor Scorecard in Destination 3. |
| **Road Asset Search & Filter** | `views/RoadPassportView.tsx` | `GET /api/roads` | `roads.csv` | Connected & Functional | **Move into Destination 2 (Investigate)**. Provide unified search bar by Road ID or Road Name. |
| **Road Passport 10 Chapters** | `views/RoadPassportView.tsx` | `GET /api/roads/{road_id}` | `roads.csv`, `work_orders.csv`, `complaints.csv`, `accidents.csv`, `flood_hotspots.csv` | Connected & Functional | **Move into Destination 2 (Investigate)**. Add sticky chapter tabs (Specifications, Warranty, Traffic, History, Evidence) to kill scroll fatigue. |
| **Work Order Evidence Modal** | `components/WorkOrderEvidenceModal.tsx` | `GET /api/audits/work-orders/{wo_id}/evidence` | `work_orders.csv`, `rate_card.csv` | Connected & Functional | **Global Modal Component**. Retain forensic provenance badges, rate-variance breakdown, and DLP status. |
| **Visual Money Trace Graph** | `views/VisualMoneyTraceGraphView.tsx` | `GET /api/graph` | Graph Service (nodes: Ward, Road, Work Order, Contractor, Complaint) | Functional but Cluttered | **Integrate into Destination 2 (Investigate)**. Switch to progressive disclosure (center on active road), entity category filtering, and slide-out inspector. |
| **Structured Forensic Table** | *New in Redesign* | `GET /api/graph` | Graph Service | Planned | **Integrate into Destination 2 (Investigate)** as a side-by-side toggle for non-graph users. |
| **DLP Sentinel & Audit Triage** | `views/AuditsInvestigationView.tsx` | `GET /api/audits/findings` | Repair Auditor (`work_orders.csv`, `rate_card.csv`) | Connected & Functional | **Move into Destination 3 (Accountability)**. Add high-contrast severity filters (Critical, High, Moderate) and status badges. |
| **RoadLife Durability Intel** | `views/FairAccountabilityView.tsx` | `GET /api/intelligence/durability-risk` | ML Anomaly Engine & Durability heuristics | Connected & Functional | **Move into Destination 3 (Accountability)**. Combine with repeat repair hotspot map. |
| **Contractor Scorecards & Tenders** | `views/FairAccountabilityView.tsx` | `GET /api/contractors` & `/api/civic/contractor-intelligence` | `civic.db`, `contractors.csv` | Connected & Functional | **Move into Destination 3 (Accountability)**. Clean side-by-side comparison matrix and transparent tender simulator. |
| **JANMAT Participatory Budget** | `views/NextRupeePlannerView.tsx` | `GET /api/civic/janmat/proposals` | `civic.db` (JANMAT Service) | Connected & Functional | **Move into Destination 4 (Next Rupee)** & **Destination 5 (Public Portal)**. Citizen-facing voting in Portal; civic planner analysis in Next Rupee. |
| **Civic Budget Simulator** | `views/NextRupeePlannerView.tsx` | `POST /api/civic/simulator/optimize` | `budget_simulator_service.py` | Connected & Functional | **Move into Destination 4 (Next Rupee)**. Interactive knapsack sliders, scenario comparison, itemized project lists. |
| **Material & Cost Intelligence** | `views/NextRupeePlannerView.tsx` | `GET /api/civic/materials/alternatives` | `material_intelligence_service.py` (IRC/MoRTH) | Connected & Functional | **Move into Destination 4 (Next Rupee)**. Clear cost-reduction vs durability comparison cards. |
| **Citizen Verification Portal** | `views/CitizenOfficerCasesView.tsx` | `GET /api/civic/verification/stages` & `/api/cases` | `citizen_verification_service.py` | Connected & Functional | **Move into Destination 5 (Public Portal)**. 7-stage progress tracker, before-and-after photo inspection, conflict alert banners. |
| **AI Evidence Assistant Drawer** | `components/AIAssistantDrawer.tsx` | `POST /api/assistant/chat` | `assistant_service.py` (Claude API / Local deterministic retrieval) | Connected & Functional | **Unify as Single Global Drawer** triggered only from header. Remove duplicate inline triggers. |

---

## 2. Redundancy & Clutter Elimination

1. **Floating AI Triggers:** Removed multiple inline assistant triggers from view headers. One persistent, keyboard-accessible (`Ctrl+K` / click) drawer in the global navigation.
2. **Duplicate Ward Selectors:** Consolidated global ward state. When user selects Ward `K/E` in the header, all child views automatically inherit Ward `K/E`.
3. **Cosmetic Role Switcher:** Upgraded role switcher (`Citizen` vs `Ward Officer`) to actually adjust visible actions:
   - *Citizen Mode:* Focuses on public transparency, road lookup, participatory voting, and repair reporting.
   - *Ward Officer Mode:* Unlocks administrative triage, tender scoring overrides, and SLA dispute resolution.
