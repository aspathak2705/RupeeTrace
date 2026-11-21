# RupeeTrace — Frontend Implementation Plan & Architecture Specification

## 1. Technical Stack
- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite 6, Tailwind CSS
- **Design System**: Neo-Brutalist design tokens (`rt-primary: #FFDE59`, `rt-canvas: #F4F1EA`, `rt-mint: #B9D9D1`, `rt-coral: #FF3B30`, `rt-ink: #171717`)
- **Icons**: Lucide React
- **State & Auth**: `AuthContext.tsx` with JWT/Bearer token persistence in `localStorage`

---

## 2. Directory Structure & Key Components

```
frontend/src/
├── api/
│   └── client.ts                 # authFetch interceptor + all REST client methods
├── components/
│   ├── AccessRestrictedGate.tsx  # High-contrast security gate with role switcher
│   ├── AIAssistantDrawer.tsx     # Cmd+K multilingual assistant drawer
│   ├── DemoTourBar.tsx           # 4-minute evaluation tour
│   ├── EvidenceBadge.tsx         # Audit & proof badges
│   ├── LoginModal.tsx            # Persona switcher & credential form
│   ├── Navbar.tsx                # Dynamic role-based navigation header
│   └── QRCodeModal.tsx           # Public road QR code sharing modal
├── context/
│   └── AuthContext.tsx           # User profile, role checks, token management
├── views/
│   ├── AccountabilityView.tsx    # DLP Sentinel, scorecards, tender advisor
│   ├── CitizenLandingView.tsx    # Citizen homepage hub with 4 action cards
│   ├── CitizenOfficerCasesView.tsx # 2-way case dialogue & official responses
│   ├── InvestigateView.tsx       # Road Passport & Investigation Board container
│   ├── NextRupeePlannerView.tsx  # Budget Simulator, knapsack, IRC materials
│   ├── OverviewView.tsx          # Ward financial overview & money trail
│   ├── PublicPortalView.tsx      # Verify, cases, JANMAT voting, My Activity
│   ├── RoadPassportView.tsx      # Public road dossier (role-conscious chapters)
│   └── VisualMoneyTraceGraphView.tsx # 6-mode scoped entity investigation board
└── App.tsx                       # Global routing, hash synchronization, layout
```

---

## 3. Key Navigation & Routing Implementation

### Citizen Workspace
1. **Home** (`citizen-home`): `CitizenLandingView`
2. **Explore Roads** (`explore-roads`): `InvestigateView` (mode: `passport`)
3. **Report Issue** (`report-issue`): `PublicPortalView` (tab: `verify` / `cases`)
4. **JANMAT** (`janmat`): `PublicPortalView` (tab: `janmat`)
5. **My Activity** (`my-activity`): `PublicPortalView` (tab: `activity`)

### Officer Workspace
1. **Overview** (`overview`): `OverviewView`
2. **Investigate** (`investigate`): `InvestigateView` (mode: `graph`)
3. **Accountability** (`accountability`): `AccountabilityView` (protected)
4. **Next Rupee** (`next-rupee`): `NextRupeePlannerView` (protected)
5. **Citizen Management** (`citizen-mgmt`): `PublicPortalView` (role: `officer`)

---

## 4. Verification & Build Integrity
- TypeScript compilation: `tsc` with `0` errors.
- Vite build: `2,161` modules compiled into production bundle (`483 kB` JS, `39 kB` CSS).
- Clean API contract: all requests include `Authorization: Bearer <token>` when authenticated.
