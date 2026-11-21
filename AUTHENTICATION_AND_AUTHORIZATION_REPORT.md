# RupeeTrace — Authentication & Authorization Implementation Report

## 1. Architecture Overview

RupeeTrace implements token-based authentication and role-based authorization to strictly enforce role boundaries between Public Citizens and Municipal Officers.

---

## 2. Backend Implementation (`rupeetrace/core/auth.py` & `rupeetrace/api/routes/auth.py`)

### 2.1 Session Store & Tokens
- **Session Tokens**: Cryptographically secure random hex tokens (`secrets.token_hex(24)`).
- **Session Registry**: In-memory `ACTIVE_SESSIONS` mapping bearer tokens to authenticated user profiles.
- **Preconfigured Demo Users**:
  - `sunita_sharma` (Password: `citizen123`, Role: `citizen`, Name: "Sunita Sharma", Ward: "K/E")
  - `rk_patil` (Password: `officer123`, Role: `officer`, Name: "Er. R. K. Patil", Title: "Executive Engineer", Ward: "K/E")
  - `admin` (Password: `admin123`, Role: "officer", Name: "Municipal Commissioner")

### 2.2 FastAPI Security Dependencies
- `get_current_user`: Extracts token from `Authorization: Bearer <token>` and returns user record or `None`.
- `require_auth`: Enforces authentication; raises `401 Unauthorized` if no valid session token exists.
- `require_role(role_name)`: Enforces role-based permissions; raises `403 Forbidden` if authenticated user lacks the required role.

### 2.3 Secured Endpoints
The following endpoints strictly require `Depends(require_role("officer"))`:
- `POST /api/cases/{case_id}/respond` (Responding to citizen cases)
- `POST /api/audits/{finding_id}/review` (Approving audit findings)
- `POST /api/civic/proposals/{proposal_id}/lifecycle` (Transitioning tender status)
- `POST /api/civic/simulator/{ward_code}/scenarios` (Saving municipal budget scenarios)
- `POST /api/civic/tenders/{proposal_id}/evaluate` (Evaluating contractor tenders)
- `POST /api/civic/materials/optimization-report` (Generating IRC material reports)
- `GET /api/civic/optimizer/{proposal_id}/report` (Accessing comprehensive cost reports)

---

## 3. Frontend Implementation (`AuthContext.tsx` & `client.ts`)

### 3.1 AuthContext
- Manages `user`, `token`, `role`, and utility booleans `isOfficer` and `isCitizen`.
- Persists session in `localStorage` under `rupeetrace_auth_token` and `rupeetrace_auth_user`.
- Provides `loginDemo('citizen' | 'officer')` and `loginCredentials(username, password)`.

### 3.2 Token Interceptor (`client.ts`)
- Implemented `authFetch` wrapping native `fetch`.
- Automatically attaches `Authorization: Bearer <token>` header to all outbound API calls.

### 3.3 Access Restriction UI (`AccessRestrictedGate.tsx`)
- Renders whenever a citizen attempts to access officer workspaces (`#/accountability`, `#/next-rupee`, `#/citizen-mgmt`).
- Displays clear municipal security notice and provides a one-click button to authenticate as Er. R. K. Patil.
