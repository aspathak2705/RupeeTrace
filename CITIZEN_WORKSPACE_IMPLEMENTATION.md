# RupeeTrace — Citizen Workspace Implementation Report

## 1. Scope & Implementation Details

The Citizen Workspace in RupeeTrace was engineered to make civic data immediately understandable to non-technical residents without sacrificing transparency or data accuracy.

---

## 2. Component Implementation Summary

### 2.1 Citizen Landing Page (`CitizenLandingView.tsx`)
- **Location**: `frontend/src/views/CitizenLandingView.tsx`
- **Features**:
  - Authenticated greeting: "Welcome, Sunita Sharma (Ward K/E Resident)".
  - Ward K/East monetary allocation snapshot (₹0.91 Cr monsoon fund).
  - Quick Street Search with autocomplete for immediate road discovery.
  - 4 high-contrast action cards linking directly to core civic workflows:
    1. *Official Road Passports* (Public Specifications & History)
    2. *7-Stage Repair Verification* (Before/After Photo Audits)
    3. *JANMAT Community Voting* (Participatory Democracy)
    4. *Ward Financial Transparency* (Billed vs Repeat Spend)
  - Neighborhood Street Radar: 8 local ward streets with live DLP warranty status tags.

### 2.2 Public Road Passport (`RoadPassportView.tsx`)
- **Location**: `frontend/src/views/RoadPassportView.tsx`
- **Role Awareness**: Uses `useAuth()`. For citizens, internal engineering rate-card deviation codes and raw ML anomaly screening tables are replaced with a clear **Public Warranty & Durability** chapter.
- **Content**:
  - Chapter 01: Physical assets, surface engineering, segment classifications.
  - Chapter 02: Citizen complaint timeline.
  - Chapter 03: Documented contractor work orders.
  - Chapter 04: Public expenditure timeline.
  - Chapter 05: Public Warranty terms (2-year DLP terms, free contractor rectification rights, retainage escrow guidelines).
  - Chapter 06: Official municipal follow-up responses from the Executive Engineer.

### 2.3 7-Stage Verification & Issue Reporting (`PublicPortalView.tsx`)
- **Location**: `frontend/src/views/PublicPortalView.tsx`
- **Capabilities**:
  - Side-by-side photographic inspection comparing contractor completion claims against ground reality.
  - "Confirm Satisfactory" release action and "Flag Discrepancy" escrow hold action.
  - Direct submission of civic complaints with road tagging.

### 2.4 JANMAT Participatory Voting (`PublicPortalView.tsx`)
- **Features**:
  - Upvoting of proposed neighborhood infrastructure works (permeable pavers, storm drains).
  - Democratic priority ranking and cost transparency.

### 2.5 My Activity Tracker (`PublicPortalView.tsx`)
- **Features**:
  - Personal tracking board displaying all submitted issues, photo verifications, and cast votes.
  - Visual status badges: "Action Taken", "Confirmed Satisfactory", "Conflict Flagged", "Upvoted".
  - Direct display of official engineer responses dispatched under warranty clauses.
