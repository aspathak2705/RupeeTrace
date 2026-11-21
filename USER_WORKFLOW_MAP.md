# RupeeTrace — End-to-End User Workflow Map

**Version:** 2.0  
**Scope:** Complete Step-by-Step Journeys for Citizen and Ward Officer Personas

---

## 1. Overview of the 5 Redesigned Product Destinations

The application is restructured into 5 core destinations accessible via the global navigation bar:

```
[ RupeeTrace ]  ──►  1. Overview       (Ward macro-finances, quick audit alerts, top contractors)
                     2. Investigate    (Road search, Road Passport, Money Trace Graph, Work Order evidence)
                     3. Accountability (DLP Sentinel, RoadLife durability, Contractor Scorecards, Tender advisor)
                     4. Next Rupee     (JANMAT participatory democracy, Knapsack simulator, Material cost optimization)
                     5. Public Portal  (Citizen reporting, 7-stage verification, Photo evidence, Community voting)
```

---

## 2. Citizen Persona Journeys

### Journey C-1: Discovering Ward Spending
1. **Entry Point:** Citizen visits RupeeTrace and lands on **Destination 1 (Overview)**.
2. **Ward Selection:** Selects local ward (e.g. `K/E - Andheri East`) from the persistent ward selector.
3. **Macro Financial Assessment:**
   - Observes Total Budget (`₹91,00,000`), Total Recorded Expenditure (`₹82,64,048`), and Utilization (`90.81%`).
   - Notes DLP Breach jobs (`2`) and Reopened jobs (`18`).
4. **Actionable Transition:** Notices high repeat-repair alerts on *Marol Maroshi Road* and clicks **"Investigate This Road"** CTA.

### Journey C-2: Investigating a Neighborhood Street
1. **Entry Point:** Lands on **Destination 2 (Investigate)** with road `RD0140` pre-selected.
2. **Road Passport Exploration:**
   - **Specs:** Checks surface type (Bituminous Concrete), length (1,850 m), and DLP warranty status (`EXPIRED / BREACHED`).
   - **Expenditure History:** Reviews historical work orders totaling ₹6.71 Lakh across 3 repairs.
   - **Citizen Complaints:** Cross-references 4 linked complaints reporting "Severe potholes near metro station".
3. **Evidence Drill-Down:** Clicks work order `WO-KE-2025-0042` to inspect the **Work Order Evidence Modal**.
   - Inspects rate-card items, asphalt metric rates, and discovers ₹34,200 overbilling against BMC schedule of rates.

### Journey C-3: Tracing the Rupee (Visual & Tabular)
1. **Entry Point:** Within **Destination 2 (Investigate)**, toggles the **"Money Trace Graph"** tab.
2. **Targeted Progressive Exploration:**
   - Graph centers directly on `RD0140`.
   - Node badges indicate connected contractors (`M/s Apex Infra`), budget origin, and complaint clusters.
3. **Entity Inspector:** Clicks the contractor node; the right-side **Entity Inspector Drawer** slides open showing total contracts won in Ward K/E, reopen rate (22.5%), and active DLP violations.
4. **Structured Table Alternative:** If preferred, toggles "Forensic Table View" for an itemized, spreadsheet-style audit trail.

### Journey C-4: Filing a Complaint & Verifying Completed Repairs
1. **Entry Point:** Navigates to **Destination 5 (Public Portal)**.
2. **Complaint Submission:** Submits a pothole report with GPS coordinates and photo evidence.
3. **Verification Tracking:**
   - Navigates to the **Citizen Verification Tab**.
   - Locates work order `WO-KE-2025-0089` currently at *Stage 5: Citizen Visual Verification*.
   - Compares the contractor's *Before* photo against the *After* photo side-by-side.
   - Citizen notes fresh gravel already dispersing and flags a **Discrepancy Conflict Alert**.

### Journey C-5: Shaping Future Infrastructure (Participatory Democracy)
1. **Entry Point:** Navigates to **Destination 4 (Next Rupee)** or **Public Portal (JANMAT Tab)**.
2. **Proposal Review:** Browses citizen-submitted road proposals for Ward K/E.
3. **Civic Voting:** Upvotes Proposal `PR-KE-0012: Concrete Paver Block Transition for Marol Naka` with high durability index (+4.2 years) and DLP protection warranty.

---

## 3. Ward Officer / Investigator Journeys

### Journey O-1: Ward Audit & DLP Breach Triage
1. **Entry Point:** Switches persona toggle in header to **"Ward Officer"** and navigates to **Destination 3 (Accountability)**.
2. **DLP Sentinel Triage:**
   - Filters findings by `Severity: CRITICAL`.
   - Identifies work orders executed within active 3-year warranty windows where BMC funds were disbursed for contractor defect liability.
   - Reviews system recommendation: *"Withhold bank guarantee & issue recovery notice under Clause 18."*
3. **Audit Disposition:** Clicks **"Acknowledge & Flag for Recovery"**, updating the internal case status with audit provenance timestamp.

### Journey O-2: Contractor Performance & Tender Advisory
1. **Entry Point:** Within **Destination 3 (Accountability)**, clicks **"Contractor Scorecards & Tender Advisor"**.
2. **Scorecard Matrix:**
   - Evaluates all 8 empaneled contractors across Quality, SLA Compliance, Durability, and Overbilling metrics.
   - Identifies contractors with repeat defect re-openings (>20%).
3. **Tender Scenario Simulation:**
   - Inputs tender parameters: Road Category = Major Arterial, Estimated Value = ₹1.2 Cr.
   - Adjusts QCBS weights (70% Technical Track Record, 30% Financial Bid).
   - Generates transparent ranking: L1 vs Quality-Weighted optimal bidder, preventing low-bid high-failure procurement.

### Journey O-3: Next Rupee Budget Simulation & Material Optimization
1. **Entry Point:** Navigates to **Destination 4 (Next Rupee)**.
2. **Civic Budget Knapsack Simulation:**
   - Selects Ward Budget (`₹1.5 Cr available reserve`).
   - Chooses objective: **"Maximize Durability & Citizen Impact"**.
   - Runs Knapsack Optimizer; algorithm selects 6 high-leverage road resurfacing projects maximizing 8-dimension civic score while remaining within budget cap.
3. **Material & Engineering Optimization:**
   - Inspects material recommendations conforming to IRC:SP:98 and MoRTH specifications.
   - Replaces standard Bituminous Concrete with *Warm Mix Asphalt (WMA) + Crumb Rubber Modified Bitumen (CRMB-55)*, cutting lifecycle cost by 14.8% and reducing monsoon wash-out risk.
4. **Decision Brief Generation:** Exports the **13-Point Civic Value Optimizer Executive Brief** for submission to the Assistant Municipal Commissioner.
