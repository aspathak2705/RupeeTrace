# RupeeTrace — Officer Workspace Implementation Report

## 1. Scope & Implementation Details

The Officer Workspace in RupeeTrace provides municipal engineers, vigilance officers, and auditors with forensic capabilities to track funds, monitor contractor performance, enforce warranty liabilities, and plan capital budgets.

---

## 2. Component Implementation Summary

### 2.1 Ward Financial Overview & Money Trail (`OverviewView.tsx`)
- **Location**: `frontend/src/views/OverviewView.tsx`
- **Capabilities**:
  - Full financial waterfall: Monsoon repair budget vs total billed expenditure vs repeat repair leakage.
  - Contractor market share breakdown for the selected ward.
  - Direct links to entity investigations and audit evidence dossiers.

### 2.2 Scoped Entity Investigation Board (`VisualMoneyTraceGraphView.tsx`)
- **Location**: `frontend/src/views/VisualMoneyTraceGraphView.tsx`
- **Capabilities**:
  - 6 Scoped Modes: Road, Work Order, Contractor, Complaint, Ward, and Audit.
  - Centered root entity with 1-hop radial layout (radius 220px).
  - Progressive disclosure via "Expand Connections".
  - ML Candidate Link Toggle (off by default, dashed crimson line with confidence score).
  - Contextual right-side inspector drawer with metadata and evidence buttons.
  - Tabular Forensic Ledger alternative view.

### 2.3 Accountability Suite (`AccountabilityView.tsx`)
- **Location**: `frontend/src/views/AccountabilityView.tsx`
- **Capabilities**:
  - **DLP Sentinel**: Identifies work orders executed on roads under active 2-year warranty to prevent illegal double billing.
  - **Contractor Scorecards**: Multi-metric evaluation ranking contractors by defect rates, delay penalties, and cost variances.
  - **Tender Evaluation Advisor**: Automated algorithmic bidder screening assessing capability against tender scope.

### 2.4 Next Rupee Planner 2.0 (`NextRupeePlannerView.tsx`)
- **Location**: `frontend/src/views/NextRupeePlannerView.tsx`
- **Capabilities**:
  - **Budget Simulator**: Interactive capital allocation sliders.
  - **Knapsack Prioritization**: Multi-criteria project selection combining technical road condition, traffic density, and citizen votes.
  - **IRC Material Intelligence**: Evaluates asphalt vs white-topping vs composite alternatives with lifecycle cost payback calculations.

### 2.5 Citizen Management Triage (`PublicPortalView.tsx` & `CitizenOfficerCasesView.tsx`)
- **Location**: `frontend/src/views/CitizenOfficerCasesView.tsx`
- **Capabilities**:
  - Case review with citizen observations and photo evidence.
  - Dispatch of binding official municipal directives (e.g. rectification under warranty clause 14).
  - Adjudication of citizen verification discrepancy flags.
