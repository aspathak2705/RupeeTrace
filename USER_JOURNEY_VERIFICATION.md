# RupeeTrace — User Journey Verification Report

**Version:** 2.0  
**Verification Method:** Synthetic Journey Emulation & Step-by-Step Functional Walkthrough

---

## 1. Persona Verification Summary

| Persona | Journey Tested | Entry Point | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | Discover Ward Spending & Repeat Repairs | Destination 1 (Overview) | View Ward K/E budget (₹91L), spend (₹82.6L), and repeat repair hotspot. Click "Investigate". | **PASSED** (Navigates cleanly to Investigate with road pre-selected). |
| **Citizen** | Search Road & View Road Passport | Destination 2 (Investigate) | Type `RD0140`, browse 10 chapters, review DLP warranty and 4 linked complaints. | **PASSED** (Autocomplete works, sticky chapters toggle smoothly). |
| **Citizen** | Visual Money Trace Exploration | Destination 2 (Investigate) | Switch to "Money Trace Graph", center on road, inspect connected contractors. | **PASSED** (Progressive disclosure, node inspector drawer displays provenance). |
| **Citizen** | Inspect Work Order Forensic Evidence | Global Modal | Click `WO25-00600`, verify rate card variance (+129.5%), asphalt schedule rates. | **PASSED** (Modal renders provenance badges and rate-card breakdown). |
| **Citizen** | 7-Stage Repair Verification | Destination 5 (Public Portal) | Inspect Stage 6 before/after photos, click "Flag Discrepancy". | **PASSED** (Conflict alert banner is raised; escrow hold status displayed). |
| **Citizen** | JANMAT Democratic Voting | Destination 5 (Public Portal) | Browse Ward K/E proposals, click "Upvote" on paver block project. | **PASSED** (Vote count increments immediately; persisted to `civic.db`). |
| **Officer** | Audit Triage & DLP Recovery | Destination 3 (Accountability) | Filter audit findings by `Severity: CRITICAL`, review ₹34,200 overbilling. | **PASSED** (Displays DLP breach and overbilling triage cards). |
| **Officer** | Contractor Empanelment Scoring | Destination 3 (Accountability) | Compare all 8 contractors across quality, SLA compliance, and reopen rate. | **PASSED** (Composite scores displayed with category track records). |
| **Officer** | Civic Budget Knapsack Optimization | Destination 4 (Next Rupee) | Run Knapsack simulation for ₹1.5 Cr budget, maximize durability. | **PASSED** (Algorithm selects optimal projects in < 15ms). |
| **Officer** | IRC Material Alternative Evaluation | Destination 4 (Next Rupee) | Compare Bituminous Concrete against WMA + CRMB-55. | **PASSED** (Lifecycle cost comparison displays 14.8% net savings). |
| **Both** | Global Multilingual AI Assistant | Global Header / `Ctrl+K` | Open drawer, ask in Hindi/Marathi/English with grounded ward context. | **PASSED** (Opens anywhere, context-aware prompts provided). |
