# RupeeTrace — Frontend-Backend API Dependency & Data Contract Map

**Version:** 2.0  
**Scope:** Exhaustive API Endpoints, Parameters, Response Types, and Client Consuming Components

---

## 1. Ward & Macro-Financial APIs

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Wards** | `GET` | `/api/wards` | `List[WardSummary]` | `Navbar.tsx`, `OverviewView.tsx` | Fallback to cached ward list; shows retry alert on failure. |
| **Ward Details** | `GET` | `/api/wards/{ward_code}` *(supports dual-route `/api/wards/{prefix}/{suffix}`)* | `WardDetailResponse` | `OverviewView.tsx` | Handles unencoded and encoded slashes (`K/E` vs `K%2FE`). |
| **Ward Money Trail** | `GET` | `/api/wards/{ward_code}/money-trail` *(supports dual-route `/{prefix}/{suffix}/money-trail`)* | `MoneyTrailResponse` | `OverviewView.tsx` | Gracefully renders empty charts if ward has zero recorded spend. |
| **Ward Next Rupee Baseline** | `GET` | `/api/wards/{ward_code}/next-rupee` | `Dict[str, Any]` | `OverviewView.tsx`, `NextRupeeView.tsx` | Deterministic fallback calculation from expenditure ratio. |

---

## 2. Road Asset & Investigation APIs

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Roads** | `GET` | `/api/roads?ward_code={code}` | `List[RoadSummary]` | `InvestigateView.tsx` (Road Search) | Debounced search query; returns empty array if no match. |
| **Road Detail (Passport)** | `GET` | `/api/roads/{road_id}` | `RoadDetailResponse` | `InvestigateView.tsx` (`RoadPassport`) | Returns 404 if road missing; handles optional `congestion_index` & `accidents_count`. |
| **Work Order Evidence** | `GET` | `/api/audits/work-orders/{wo_id}/evidence` | `AuditEvidenceResponse` | `WorkOrderEvidenceModal.tsx` | Provides full rate-card provenance and DLP inspection. |
| **Visual Money Trace Graph** | `GET` | `/api/graph?road_id={id}&max_work_orders={n}` | `{ nodes: [], links: [] }` | `InvestigateView.tsx` (`MoneyTraceGraph`) | Centers on `road_id` or root ward; falls back to structured list view if WebGL unavailable. |

---

## 3. Accountability & Auditor APIs

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Audit Findings** | `GET` | `/api/audits/findings?ward_code={code}&flag_type={type}` | `List[AuditFinding]` | `AccountabilityView.tsx` (DLP Sentinel) | Filters by severity and status. |
| **Road Durability Risk** | `GET` | `/api/intelligence/durability-risk?ward_code={code}` | `List[Dict[str, Any]]` | `AccountabilityView.tsx` (RoadLife) | Calculates repeat repair frequencies & survival curve estimates. |
| **Contractor Profiles** | `GET` | `/api/contractors` | `List[Dict[str, Any]]` | `AccountabilityView.tsx` (Scorecards) | Empaneled contractor track records, reopen rates, penalty count. |
| **Tender Simulation** | `POST` | `/api/civic/contractors/tender-evaluate` | `Dict[str, Any]` | `AccountabilityView.tsx` (Tender Advisor) | Multi-attribute scoring fallback if contractor history incomplete. |

---

## 4. Next Rupee & Participatory Planning APIs

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Proposals (JANMAT)** | `GET` | `/api/civic/janmat/proposals?ward_code={code}` | `List[Dict[str, Any]]` | `NextRupeeView.tsx`, `PublicPortalView.tsx` | Pre-seeded with 400 civic proposals across 24 wards. |
| **Submit Proposal Vote** | `POST` | `/api/civic/janmat/proposals/{id}/vote` | `{ success: bool, votes: int }` | `NextRupeeView.tsx`, `PublicPortalView.tsx` | Optimistic UI update with rollback on network failure. |
| **Budget Simulator Optimize** | `POST` | `/api/civic/simulator/optimize` | `{ selected_proposals: [], ... }` | `NextRupeeView.tsx` (Budget Simulator) | Bounded greedy knapsack algorithm execution in < 15ms. |
| **Material Alternatives** | `GET` | `/api/civic/materials/alternatives?road_type={t}` | `List[Dict[str, Any]]` | `NextRupeeView.tsx` (Materials Tab) | Conforms to IRC:SP:98 and MoRTH specifications. |
| **Civic Value Optimizer** | `GET` | `/api/civic/optimizer/decision-brief/{ward_code}` | `Dict[str, Any]` (13-point brief) | `NextRupeeView.tsx` (Brief Generator) | Synthesizes budget, DLP recovery, contractor track records. |

---

## 5. Public Portal & Citizen Verification APIs

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Submit Complaint** | `POST` | `/api/cases/complaints` | `Dict[str, Any]` | `PublicPortalView.tsx` | Validates GPS coordinates and category. |
| **Verification Stages** | `GET` | `/api/civic/verification/stages?ward_code={code}` | `List[Dict[str, Any]]` | `PublicPortalView.tsx` | 7-stage verification lifecycle tracking. |
| **Submit Citizen Verification**| `POST` | `/api/civic/verification/verify` | `{ verified: bool, conflict_alert: bool }` | `PublicPortalView.tsx` | Flags discrepancy conflict if citizen photo contradicts contractor claim. |

---

## 6. AI Evidence Assistant API

| Endpoint | Method | Path / Query Parameters | Response Schema | Consuming Components | Fallback / Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AI Evidence Chat** | `POST` | `/api/assistant/chat` | `{ reply: str, citations: [], ... }` | `AIAssistantDrawer.tsx` | Multilingual (English, Hindi, Marathi, Hinglish); local retrieval grounding. |
