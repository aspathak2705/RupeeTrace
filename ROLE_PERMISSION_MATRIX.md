# RupeeTrace — Role & Permission Authorization Matrix

## 1. Authentication Architecture

RupeeTrace enforces Role-Based Access Control (RBAC) at two independent levels:
1. **Frontend Gate**: Role-aware UI components, route interception, and high-contrast `<AccessRestrictedGate>` modal with one-click credential login.
2. **Backend Guard**: FastAPI dependency injection (`require_auth`, `require_role("officer")`) validating `Authorization: Bearer <token>` against the active in-memory session registry (`rupeetrace/core/auth.py`).

---

## 2. Global Role Definitions

| Role Identifier | Default Persona | Primary Responsibilities | Authorization Level |
|---|---|---|---|
| `anonymous` | Unauthenticated Visitor | Read-only public transparency data | Level 0 |
| `citizen` | Sunita Sharma | Road discovery, complaints, verifications, JANMAT voting, tracking | Level 1 |
| `officer` | Er. R. K. Patil | Forensic investigation, audit review, tender evaluation, budget simulation, response dispatch | Level 2 |

---

## 3. Route & View Permission Matrix

| View / URL Slug | Accessible By Citizen? | Accessible By Officer? | Non-Authorized Action |
|---|---|---|---|
| `#/citizen-home` | Yes | Yes (Can toggle) | Allowed |
| `#/explore-roads` | Yes | Yes | Allowed |
| `#/report-issue` | Yes | Yes | Allowed |
| `#/janmat` | Yes | Yes | Allowed |
| `#/my-activity` | Yes | Yes | Allowed |
| `#/overview` | Yes (Public View) | Yes (Full Trail) | Allowed |
| `#/investigate` | Yes (Public Specs) | Yes (Forensic Board) | Allowed |
| `#/accountability` | **No** | **Yes** | Displays `<AccessRestrictedGate>` |
| `#/next-rupee` | **No** | **Yes** | Displays `<AccessRestrictedGate>` |
| `#/citizen-mgmt` | **No** | **Yes** | Displays `<AccessRestrictedGate>` |

---

## 4. Backend API Endpoint Authorization Matrix

| Endpoint | Method | Permitted Roles | Unauthorized Code | Notes |
|---|---|---|---|---|
| `/api/auth/login` | POST | Public | - | Issues Bearer session token |
| `/api/auth/me` | GET | Authenticated | 401 Unauthorized | Validates current Bearer token |
| `/api/wards` | GET | Public | - | Public ward listings |
| `/api/wards/{ward}/money-trail` | GET | Public | - | Public ward financial summary |
| `/api/roads` | GET | Public | - | Public road asset list |
| `/api/roads/{road_id}` | GET | Public | - | Public Road Passport data |
| `/api/graph/investigate` | GET | Public | - | Scoped entity investigation graph |
| `/api/cases` | GET | Public | - | Public case dialogues |
| `/api/cases` | POST | Citizen, Officer | 401 Unauthorized | Submits citizen observation |
| `/api/cases/{id}/respond` | POST | **Officer Only** | **403 Forbidden** | Dispatches official engineer disposition |
| `/api/audits/{id}/review` | POST | **Officer Only** | **403 Forbidden** | Reviews audit finding |
| `/api/civic/proposals/{id}/lifecycle` | POST | **Officer Only** | **403 Forbidden** | Transitions tender lifecycle |
| `/api/civic/simulator/{ward}/scenarios` | POST | **Officer Only** | **403 Forbidden** | Saves municipal budget scenario |
| `/api/civic/tenders/{id}/evaluate` | POST | **Officer Only** | **403 Forbidden** | Runs contractor tender evaluation |
| `/api/civic/materials/optimization-report` | POST | **Officer Only** | **403 Forbidden** | Generates IRC material recommendation |
| `/api/civic/optimizer/{id}/report` | GET | **Officer Only** | **403 Forbidden** | Retrieves comprehensive cost report |
| `/api/civic/proposals` | GET | Public | - | Public JANMAT proposals |
| `/api/civic/proposals/{id}/vote` | POST | Citizen, Officer | 401 Unauthorized | Casts JANMAT community vote |
| `/api/civic/verifications` | POST | Citizen, Officer | 401 Unauthorized | Submits Before/After verification |
