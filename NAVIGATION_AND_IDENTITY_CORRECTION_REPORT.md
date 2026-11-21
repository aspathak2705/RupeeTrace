# RupeeTrace — Navigation Simplification & Role-Based Identity Correction Report

## 1. Executive Summary

This report documents the architectural and visual refactoring performed to eliminate visual clutter, remove duplicated controls, enforce authentic role boundaries, and align RupeeTrace with a clean civic-tech dashboard aesthetic.

---

## 2. Navigation Elements Audit

### 2.1 Elements Removed
1. **Judge Walkthrough Toolbar (`DemoTourBar.tsx`)**:
   - Completely removed from the top layout in `frontend/src/App.tsx`.
   - Removed the 4-Minute Evaluation Tour header and all 7 shortcut buttons (`1. Ward Trail`, `2. Road Passport`, `3. Trace Graph`, `4. Audit Flag`, `5. Contractors`, `6. Case Dialogue`, `7. Next Rupee`).
2. **Duplicated AI Assistant Buttons**:
   - Removed upper "Ask AI Assistant" button previously situated in the walkthrough bar.
   - Removed the upper-right "AI ASSISTANT (⌘K)" header button beside the search bar in `frontend/src/components/Navbar.tsx`.
3. **Cosmetic Role Switch Buttons**:
   - Removed the inline `Switch` button inside the authenticated identity badge in `Navbar.tsx`.
   - Removed the local `Switch Role` toggle button in `frontend/src/views/NextRupeePlannerView.tsx`.
4. **Distracting Tab Badges**:
   - Removed verbose badge pills (`ROAD PASSPORT`, `7-STAGE VERIFY`, `VOTING`, `TRACKER`, `6 MODES`, `DLP & AUDIT`, `PLANNER 2.0`, `TRIAGE`) from the primary navigation tab row to maintain clean typography.

### 2.2 Elements Retained
1. **Single Global AI Assistant**:
   - Exactly **ONE** primary entry point retained: the floating bottom-right assistant button in `App.tsx` (with keyboard trigger `Cmd+K` / `Ctrl+K`).
2. **Simplified Header Row**:
   - RupeeTrace branding and product tagline.
   - Current Workspace indicator (`CITIZEN WORKSPACE` or `OFFICER WORKSPACE`).
   - Global Road ID & Work Order search input.
   - Ward selector dropdown (e.g. `Ward K/E`).
   - Authenticated User Identity card (`Sunita Sharma` or `Er. R. K. Patil`).
   - Dedicated **Logout** action button (`LogOut` icon) or **Log In** button when unauthenticated.
3. **Single Clean Primary Navigation Row**:
   - High-contrast, Neo-Brutalist buttons with exact icons and labels.

---

## 3. Final Citizen vs Officer Navigation Differences

| Navigation Dimension | Citizen Workspace | Officer Workspace |
|---|---|---|
| **Header Badge** | `CITIZEN WORKSPACE` (Primary Yellow) | `OFFICER WORKSPACE` (Mint Green) |
| **Primary Destinations** | 1. `Home`<br>2. `Explore Roads`<br>3. `Report Issue`<br>4. `JANMAT`<br>5. `My Activity` | 1. `Overview`<br>2. `Investigate`<br>3. `Accountability`<br>4. `Next Rupee`<br>5. `Citizen Management` |
| **Language & Framing** | Civic transparency, public asset specs, photo verify, participatory voting | Forensic money trail, 6-mode investigation board, DLP sentinel, budget simulation |
| **Identity Display** | `Sunita Sharma` (Public Citizen) | `Er. R. K. Patil` (Municipal Officer) |
| **Access Gate** | Intercepts attempts to access officer URLs with `<AccessRestrictedGate>` | Full administrative and analytical access |

---

## 4. Authentication & Role-Enforcement Changes

1. **Server-Enforced Sessions**:
   - Replaced static client-side toggles with cryptographically generated Bearer tokens (`rt_sess_<hex>`).
   - Backend `rupeetrace/core/auth.py` maintains `ACTIVE_SESSIONS`.
   - Frontend `AuthContext.tsx` derives role and permissions exclusively from the verified user session returned by the backend.
2. **Explicit Logout Invalidation**:
   - To switch identities, users must click **Logout**.
   - `POST /api/auth/logout` explicitly deletes the session token from `ACTIVE_SESSIONS` on the server.
   - Frontend `AuthContext` clears `localStorage` token, setting `user: null` and `token: null`.
   - Logging in again requires authenticating through `LoginModal.tsx`.
3. **Demo Account Labeling**:
   - Demo profiles in `LoginModal.tsx` are explicitly badged: `DEMO IDENTITY • CITIZEN` and `DEMO IDENTITY • OFFICER`.
   - Authenticating via demo credentials generates a separate server-backed Bearer session token.

---

## 5. Backend Authorization Checks Performed

The following endpoints were audited and equipped with `Depends(require_role("officer"))`:

| Endpoint | Method | Security Dependency | Citizen Result | Officer Result |
|---|---|---|---|---|
| `/api/cases/{case_id}/respond` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/audits/{finding_id}/review` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/proposals/{id}/lifecycle` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/simulator/{ward}/optimize` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/simulator/{ward}/scenarios` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/tenders/{id}/evaluate` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/materials/optimization-report` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/materials/ai-research` | POST | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/civic/optimizer/{id}/report` | GET | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/intelligence/anomalies` | GET | `require_role("officer")` | **403 Forbidden** | 200 OK |
| `/api/intelligence/anomalies/{wo_id}` | GET | `require_role("officer")` | **403 Forbidden** | 200 OK |

---

## 6. Targeted Verification Results

Executed automated test suite (`python test_auth_rbac_targeted.py`) confirming:
1. `create_session` generated authentic tokens for Citizen and Officer demo profiles.
2. `require_auth` correctly identified authenticated personas (`Sunita Sharma` vs `Er. R. K. Patil`).
3. Missing or invalid tokens raised `401 Unauthorized`.
4. Citizen session accessing officer-only dependencies raised `403 Forbidden` (`Access forbidden: 'Officer' authorization required. Current role is 'citizen'.`).
5. Officer session accessing officer dependencies passed successfully.
6. `auth.logout()` invalidated session token from `ACTIVE_SESSIONS`.
7. Dead session token was rejected with `401 Unauthorized` on both `/api/auth/me` and protected actions.
8. Frontend build (`npm run build`) compiled 2,160 modules in 9.23s with 0 errors.

---

## 7. Remaining Security Gaps & Limitations

1. **In-Memory Session Persistence**:
   - `ACTIVE_SESSIONS` is stored in server memory. Restarting the backend server terminates active sessions, requiring users to log in again. Production deployment should adopt Redis or signed JWTs (RS256).
2. **Public Read-Only Endpoints**:
   - Public ward listings, aggregated road passport specifications, and citizen complaints remain accessible without authentication (`200 OK`) to support public transparency.
