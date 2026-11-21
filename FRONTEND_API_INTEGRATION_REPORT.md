# RupeeTrace — Frontend API Integration & Data Dependency Report

## 1. Overview

This report details how all views and components in the RupeeTrace frontend integrate with the FastAPI backend endpoints, including authentication interceptors and payload contracts.

---

## 2. API Client Architecture (`frontend/src/api/client.ts`)

All outbound HTTP calls pass through `authFetch`, which reads the current bearer token from `localStorage` (`rupeetrace_auth_token`) and injects it into the `Authorization` header:

```ts
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('rupeetrace_auth_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
```

---

## 3. View-to-Endpoint Mapping

| View Component | Backend Endpoint | HTTP Method | Payload / Query Parameters | Response Data |
|---|---|---|---|---|
| `LoginModal.tsx` | `/api/auth/login` | POST | `{ username, password }` | `{ token, user }` |
| `Navbar.tsx` | `/api/auth/demo-accounts` | GET | None | `Record<string, User>` |
| `Navbar.tsx` | `/api/wards` | GET | None | `WardSummary[]` |
| `CitizenLandingView.tsx` | `/api/roads` | GET | None | `RoadSummary[]` |
| `CitizenLandingView.tsx` | `/api/wards/{ward}/money-trail` | GET | Path: `ward_code` | `MoneyTrail` |
| `RoadPassportView.tsx` | `/api/roads/{road_id}` | GET | Path: `road_id` | `RoadDetail` |
| `RoadPassportView.tsx` | `/api/roads/{road_id}/complaints` | GET | Path: `road_id` | `Complaint[]` |
| `RoadPassportView.tsx` | `/api/roads/{road_id}/financial-history` | GET | Path: `road_id` | `RoadFinancialHistory` |
| `RoadPassportView.tsx` | `/api/audits?road_id={id}` | GET | Query: `road_id` | `AuditFinding[]` |
| `RoadPassportView.tsx` | `/api/cases?road_id={id}` | GET | Query: `road_id` | `CaseRecord[]` |
| `VisualMoneyTraceGraphView.tsx` | `/api/graph/investigate` | GET | Query: `mode`, `entity_id`, `expanded_nodes`, `include_ml` | `EntityInvestigationResponse` |
| `AccountabilityView.tsx` | `/api/audits/dlp-sentinel/{ward}` | GET | Path: `ward_code` | `DLPSentinelResponse` |
| `AccountabilityView.tsx` | `/api/audits/contractor-scorecards` | GET | Query: `ward_code` | `ContractorScorecard[]` |
| `NextRupeePlannerView.tsx` | `/api/civic/simulator/{ward}/scenarios` | POST | `{ ward_code, ... }` | `BudgetSimulationResult` |
| `PublicPortalView.tsx` | `/api/civic/verifications/{road_id}/summary` | GET | Path: `road_id` | `RoadVerificationSummary` |
| `PublicPortalView.tsx` | `/api/civic/verifications` | POST | `{ road_id, verification_action, ... }` | `VerificationSubmissionResponse` |
| `PublicPortalView.tsx` | `/api/civic/proposals` | GET | Query: `ward_code` | `CivicProposal[]` |
| `PublicPortalView.tsx` | `/api/civic/proposals/{id}/vote` | POST | `{ voter_id, vote_type }` | `VoteResult` |
| `CitizenOfficerCasesView.tsx` | `/api/cases` | POST | `{ road_id, citizen_observation, ... }` | `CaseRecord` |
| `CitizenOfficerCasesView.tsx` | `/api/cases/{id}/respond` | POST | `{ officer_name, officer_response, new_status }` | `CaseRecord` |

---

## 4. Error Handling & Fallbacks
- Network failures in background loads (e.g. ML signals or optional proposals) catch gracefully to empty arrays (`[]`) or `null` without crashing the parent view.
- 403 Forbidden responses trigger user-friendly prompts or modal switches.
