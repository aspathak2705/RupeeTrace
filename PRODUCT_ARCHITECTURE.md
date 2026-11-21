# RupeeTrace 2.0 — Product Architecture & Systems Specification

## 1. Executive Summary

RupeeTrace 2.0 evolves from a post-expenditure forensic tool into an integrated **Civic Infrastructure Intelligence System**. It connects citizen demand, democratic priority, capital expenditure simulation, procurement integrity, material engineering optimization, and physical field verification into one unified decision-making workflow.

```
Ward Needs → Evidence Ingestion → JANMAT Proposals → Public Priority (Voting)
     ↓
Budget Simulator (Knapsack Optimization) → Scenario Comparison
     ↓
Contractor Intelligence & Tender Workspace (Empirical Track Record)
     ↓
Material & Cost Intelligence (IRC/MoRTH Standards & Lifecycle Optimization)
     ↓
Civic Value Optimizer (13-Point Unified Investment Brief)
     ↓
Citizen Verification (7-Stage Lifecycle & Discrepancy Detection) → Road Passport
```

---

## 2. Five Capability Groups & Architecture Mapping

| Group | Subsystem Name | Primary Function | Core Engine / Module |
|---|---|---|---|
| **A** | **JANMAT + Next Rupee** | Evidence-backed proposals & participatory budgeting | `janmat_service.py` |
| **B** | **Civic Budget Simulator** | Knapsack allocation, scenario modeling & trade-offs | `budget_simulator_service.py` |
| **C** | **Contractor Intelligence** | Category-specific contractor ranking & tender advisor | `contractor_intelligence_service.py` |
| **D** | **Material & Cost Intelligence** | IRC/MoRTH engineering alternatives & lifecycle NPV | `material_intelligence_service.py` |
| **E** | **Citizen Verification** | 7-stage evidence timeline & conflict discrepancy detection | `citizen_verification_service.py` |
| **F** | **Civic Value Optimizer** | Unified 13-point investment decision brief | `civic_value_optimizer_service.py` |

---

## 3. Database Schema (`rupeetrace/data/civic.db`)

Managed in SQLite using WAL mode (`PRAGMA journal_mode = WAL`) with foreign-key integrity:

1. **`proposals`**: Stores 400 evidence-grounded infrastructure proposals across all 24 BMC wards. Includes 8-factor scores, Defect Liability Period (DLP) flags, indicative costs, and lifecycle states.
2. **`proposal_votes`**: Enforces one active vote per authenticated user per proposal via `UNIQUE(proposal_id, user_id)` constraint.
3. **`proposal_comments`**: Discussion threads with actor roles (`citizen`, `officer`, `engineer`).
4. **`proposal_lifecycle`**: Audit trail recording previous status, new status, actor, reason, and supporting evidence.
5. **`budget_scenarios`**: Persisted custom capital allocation scenarios.
6. **`tender_evaluations`**: Evaluation criteria, bidder quotations, and transparent rankings (L1–L4).
7. **`verification_reports`**: 7-stage evidence reports with conflict flags for automated discrepancy alerts.

---

## 4. Synthetic Data Honesty & Provenance

To guarantee public integrity:
- **Demonstration Boundaries**: All contractor histories, citizen votes, and simulated officer responses are transparently tagged as `[Synthetic Demonstration Data]`.
- **Engineering Baseline**: Cost calculations use deterministic rate cards (`rate_card.csv`) and Indian Roads Congress (IRC:SP:98, IRC:116, IRC:SP:76) specifications.
- **DLP Protection**: Projects on roads under active Defect Liability Period are automatically flagged with a zero-cost contractor enforcement notice, preventing waste of municipal funds.
