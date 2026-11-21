# RupeeTrace — Comprehensive UX Audit & Heuristic Evaluation

**Version:** 2.0  
**Status:** Complete Audit  
**Scope:** Frontend Architecture, Navigation, Visual Design, Information Hierarchy, Persona Usability

---

## 1. Executive Summary

RupeeTrace possesses strong backend intelligence engines (Money Trail Engine, Repair Auditor, Fair Accountability Engine, Next Rupee Planner 2.0) and rich synthetic data across all 24 Mumbai BMC wards. However, the previous frontend architecture suffered from **navigational fragmentation, visual clutter, cognitive overload, and dual-persona entanglement**. 

Users had to switch between seven disconnected views (`WardMoneyTrailView`, `RoadPassportView`, `VisualMoneyTraceGraphView`, `AuditsInvestigationView`, `FairAccountabilityView`, `NextRupeePlannerView`, `CitizenOfficerCasesView`), losing mental continuity when following money from a ward budget down to an asphalt patch.

This audit details the heuristic evaluation of the existing screens, identifies critical bottlenecks, and establishes the foundation for restructuring RupeeTrace into 5 cohesive, mission-driven destinations.

---

## 2. Screen-by-Screen Usability Audit

| Screen / View | Primary Purpose | Usability Deficiencies & Cognitive Friction | Broken States / Edge Cases |
| :--- | :--- | :--- | :--- |
| **Ward Money Trail** (`WardMoneyTrailView`) | High-level ward budget, contractor breakdown, and work order table | High information density without visual hierarchy. Metric cards compete for attention. Slashes in ward codes (`K/E`, `F/N`) previously caused `404 Not Found` API failures. Missing clear "Investigate Next" action. | Selecting slash-containing ward codes (`K/E`, `P/S`) caused blank states before dual-route routing fix. |
| **Road Passport** (`RoadPassportView`) | Complete civic record for a specific road asset | 10 distinct sections arranged vertically without sticky chapter navigation or progress indicator. Users experienced "scroll fatigue". Search bar was isolated from ward filters. | Roads with missing optional fields (`accidents_count`, `congestion_index`) triggered FastAPI 500 validation crashes. |
| **Visual Money Trace Graph** (`VisualMoneyTraceGraphView`) | Force-directed provenance graph connecting budget -> road -> WO -> contractor -> complaints | "Hairball effect": rendering all nodes and relationships simultaneously caused extreme visual clutter. Lacked progressive disclosure. Canvas panning was jerky. No right-side entity inspector. | Graph disconnected from Road Passport deep links; node clicks lacked contextual detail modals. |
| **Audits & Investigation** (`AuditsInvestigationView`) | Forensic triage of DLP breaches, overbilling, and repeat repairs | Dense audit table lacked severity filtering and quick-export capabilities. Terminology ("DLP Breach", "Rate Variance") was overly bureaucratic for citizen users. | Officer review buttons were visible to citizen users, creating role confusion. |
| **Fair Accountability** (`FairAccountabilityView`) | Contractor scorecards, fairness metrics, SLA re-openings | Scorecards displayed complex weighted algorithms without tooltips explaining how the score was calculated. Tender advisor was buried below contractor lists. | Lack of side-by-side contractor comparisons for bidding analysis. |
| **Next Rupee Planner** (`NextRupeePlannerView`) | Participatory budgeting (JANMAT), Knapsack budget simulator, material recommendations | Sub-tabs were horizontally crowded. Knapsack scenario simulator did not visually explain cost vs. durability tradeoffs. Citizen verification lacked photo comparison preview. | Proposal voting state was reset upon tab switching; parameter binding issues in SQLite query. |
| **Citizen & Officer Cases** (`CitizenOfficerCasesView`) | Complaint filing, verification submissions, officer SLA triage | Mixed citizen reporting with administrative SLA disposition. Citizens saw internal administrative forms, while officers had to manually hunt for pending verifications. | Role toggle was purely cosmetic and did not isolate workflow permissions. |

---

## 3. Information Architecture Assessment

### 3.1 The "7-Island" Problem
The previous navigation exposed 7 top-level tabs. In practice, users do not think in terms of disjointed database tables; they follow a civic forensic workflow:
1. **Discover** the financial health of their ward.
2. **Investigate** a suspicious road or work order.
3. **Audit** systemic contractor performance and DLP breaches.
4. **Plan** future infrastructure investments with participatory democracy.
5. **Verify** field execution as active citizens.

### 3.2 Cognitive Disorientation
- **Breadcrumb Absence:** Users navigating from a Ward table to a Road Passport and then into a Money Trace node had no breadcrumbs to retrace their steps.
- **Scattered AI Triggers:** Multiple floating AI buttons across views competed with global navigation, confusing users on whether the assistant was context-bound or global.
- **State Loss:** Changing the global Ward filter in the header did not propagate smoothly across Road Search or Next Rupee simulation states.

---

## 4. User Persona Alignment (Citizen vs. Ward Officer)

| Dimension | Citizen Persona Journey | Ward Officer / Investigator Journey | Current Gap |
| :--- | :--- | :--- | :--- |
| **Primary Goal** | "Why is my road broken after ₹40 lakh was spent? Who fixed it and how do I vote for better roads?" | "Which contractors are in DLP breach? Where are repeat repairs happening? How do I allocate next quarter's ₹9.1 Cr budget?" | Both personas landed on the same screen with identical controls, creating clutter for citizens and lack of triage power for officers. |
| **Actionable Tasks** | Look up local street, view contractor warranty, vote in JANMAT, upload verification photo. | Review audit flags, analyze tender bids, inspect material cost savings, dispute contractor claims. | Citizen saw technical rate-card variance codes; officer lacked quick batch-approval workflows. |
| **Role Separation** | Read-only audit access, participatory voting, verified reporting. | Full triage, tender scenario simulation, administrative audit disposition. | Role switcher was an aesthetic pill rather than an architectural permission guard. |

---

## 5. Accessibility & Responsive Review

1. **Neo-Brutalist Contrast:** High-contrast borders (`3px solid #121316`) and sharp shadows (`4px 4px 0px #121316`) provide excellent visual distinction and meet WCAG AAA requirements for border contrast.
2. **Color Blindness Accessibility:** Severe audit flags relied heavily on pure `#FF3B30` red. Needs supplemental iconography (`[DLP BREACH]`, `[OVERBILLED]`) and text chips.
3. **Touch Targets:** Metric card drill-downs and table pagination buttons on mobile were under 44x44px.
4. **Mobile Responsiveness:** Deep 6-column financial tables horizontal-scrolled poorly on narrow viewports; required responsive card-based layout fallbacks.

---

## 6. Critical UX Bottlenecks (Prioritized)

1. **P0 — Fragmented Investigation Loop:** Investigating a suspicious road required visiting `WardMoneyTrailView`, writing down the Road ID (`RD0140`), navigating to `RoadPassportView`, typing the ID, then navigating to `VisualMoneyTraceGraphView` to see the money flow. **Solution:** Unify Road Search, Road Passport, and Money Trace Graph into a single `Investigate` destination with progressive disclosure.
2. **P0 — Graph "Hairball" Cognitive Overload:** The Money Trace Graph rendered hundreds of nodes simultaneously without a primary focal point. **Solution:** Center graph on the currently investigated road/work-order; provide category filters and an Entity Inspector drawer.
3. **P1 — Redundant & Competing AI Floating Buttons:** Multiple floating assistant bubbles created visual clutter. **Solution:** Consolidate into a single, permanent header drawer trigger with context-aware quick prompts.
4. **P1 — Role Clarity & Persona Guarding:** Administrative officer actions (audit status approval, tender scoring weight adjustments) must be hidden or clearly marked as demonstration officer mode.
5. **P2 — Deep Linking & URL State:** Wards with slashes (`K/E`) must be cleanly encoded and handled symmetrically in both API and frontend router.
