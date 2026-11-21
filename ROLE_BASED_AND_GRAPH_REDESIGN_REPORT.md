# RupeeTrace — Role-Based Experiences & Entity-Specific Graph Redesign Report

**Version:** 2.1  
**Status:** Complete Implementation & Verification  
**Author:** Principal Software Architect, Application Security Lead & Senior Frontend Engineer

---

## 1. Executive Summary

In direct response to critical product requirements, RupeeTrace has replaced the former cosmetic role toggle with **authentic session-backed role-based experiences** and rebuilt the Visual Money Trace Board around **entity-specific progressive investigations**.

Key achievements:
1. **Cryptographic Session Authentication & Role Authorization:** Demo accounts for Citizen (`Sunita Sharma`) and Officer (`Er. R. K. Patil`) issue real session tokens (`Authorization: Bearer <token>`). The FastAPI backend strictly enforces role checks (`require_role("officer")`), returning `403 Forbidden` if a citizen attempts administrative actions.
2. **Distinct Workspaces:**
   - **Citizen Workspace:** Features a dedicated landing page (`CitizenLandingView.tsx`), public road lookup, Road Passport, 7-stage repair photo verification, grievance reporting, and JANMAT participatory voting.
   - **Officer Workspace:** Features full financial reconciliation, 6-mode Visual Money Trace Board, DLP Sentinel audit triage, Contractor Intelligence, QCBS Tender Advisor, Knapsack Budget Simulator, and IRC:SP:98 material cost optimization.
   - **Access-Restricted Gates:** Citizens navigating to officer routes encounter an official municipal security gate with a one-click switch to officer demonstration credentials.
3. **Entity-Specific Investigation Graph Engine (No Global Network):**
   - Eliminated the global dataset graph.
   - Implemented 6 distinct scoped investigation modes:
     1. **Road Investigation:** Road &rarr; Work Orders &rarr; Ward &rarr; Complaints &rarr; DLP Audit.
     2. **Work Order Investigation:** Work Order &rarr; Road &rarr; Executing Contractor &rarr; Ward Funding &rarr; Rate Card &rarr; Outcomes.
     3. **Contractor Investigation:** Contractor &rarr; Awarded Work Orders &rarr; Associated Roads &rarr; Audit Track Record.
     4. **Citizen Complaint Investigation:** Complaint &rarr; Road &rarr; Ward &rarr; Verified Resolution Work Order.
     5. **Ward Investigation:** Ward &rarr; Monsoon Budget &rarr; Arterial Roads &rarr; Empanelled Contractors.
     6. **Audit Finding Investigation:** Audit Finding &rarr; Target Work Order &rarr; Liable Contractor &rarr; Physical Road.
4. **Progressive Exploration & Clean UX:**
   - Initial graph loads only immediate direct (1-hop) relationships.
   - Selecting a node reveals its contextual details and relationship rationale in the side inspector.
   - Explicit **"Expand Connections (+)"** action reveals adjacent records on demand without graph explosion.
5. **Strict Deterministic vs. ML Separation:**
   - ML edges are **disabled by default**.
   - When enabled via explicit toggle, ML edges render as **dashed crimson lines** with clear `[ML CANDIDATE xx%]` tags and explicit non-confirmed disclaimers.
   - Deterministic edges render as solid high-contrast borders representing verified municipal records.

---

## 2. Acceptance Criteria Fulfillment Matrix

| Criterion | Implementation | Verification |
| :--- | :--- | :--- |
| **1. Citizen & Officer Visibly Different** | `CitizenLandingView.tsx` vs. Officer financial/audit hubs. Unique navbars, action hubs, and badges. | Verified via UI inspection. |
| **2. Backend Authorization Enforced** | `rupeetrace/core/auth.py` session store & `require_role("officer")` dependency on all officer endpoints. | Python test confirmed `403 Forbidden` on citizen access. |
| **3. No Global Graph by Default** | `GraphService.investigate_entity` scopes queries strictly to target entity ID and mode. | Endpoints return only 4–14 relevant nodes instead of hundreds. |
| **4. 6 Scoped Investigation Modes** | Road, Work Order, Contractor, Complaint, Ward, and Audit modes fully operational. | Verified with all 6 mode tests in `test_roles_and_graph.py`. |
| **5. Relevant Supported Relationships** | Uses actual CSV/database keys (`roads.csv`, `work_orders.csv`, `contractors.csv`). No invented links. | Provenance badges on all nodes. |
| **6. Progressive Graph Disclosure** | 1-hop initial load; `expanded_nodes` query parameter progressively extends graph on click. | Tested in `VisualMoneyTraceGraphView.tsx`. |
| **7. Intuitive User Guidance** | Prominent instruction banner: "1. Select node &bull; 2. Expand &bull; 3. Inspect evidence". | Clear hover and selection tooltips. |
| **8. Deterministic vs ML Distinction** | ML edges disabled by default; rendered with dashed stroke, `is_ml: true`, and confidence percentage. | Verified in graph visual styling. |
| **9. Graph & Table Consistency** | "Structured Forensic Table" view tab displays exact underlying records as the visual graph. | Table view presents matching node items. |
| **10. Cross-Product Context Preservation** | Deep links from Graph to Road Passport, Work Order Evidence Modal, and Contractor Scorecards. | Context preserved across all transitions. |
