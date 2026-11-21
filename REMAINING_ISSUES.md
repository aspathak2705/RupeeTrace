# RupeeTrace — Remaining Issues, Limitations & Production Roadmap

## 1. Executive Summary

This report provides a transparent engineering assessment of current system limitations, transient edge cases, and future enhancements following the completion of the Role-Based UX and Visual Money Trace Graph redesign.

---

## 2. Current Architecture Status

### Fully Resolved in Current Sprint
- [x] Cosmetic role toggle replaced with real session token auth (`Bearer <token>`).
- [x] Backend RBAC guards (`require_role("officer")`) returning `403 Forbidden` on unauthorized operations.
- [x] Monolithic navigation replaced with role-specific workspaces:
  - Citizen: `Home | Explore Roads | Report Issue | JANMAT | My Activity`.
  - Officer: `Overview | Investigate | Accountability | Next Rupee | Citizen Management`.
- [x] Global hairball graph replaced with 6 Scoped Entity Investigation Modes.
- [x] Progressive disclosure via "Expand Connections" implemented on radial canvas.
- [x] Strict visual and semantic separation of deterministic vs ML candidate relationships.
- [x] Public Road Passport stripped of technical internal engineering variance codes for citizens.
- [x] Dedicated "My Activity" tracker implemented for citizen escrow protection.
- [x] Single unified Command Palette AI Assistant Drawer (`Cmd+K` / `Ctrl+K`).
- [x] Frontend build compiling 2,161 modules with 0 errors.

---

## 3. Known Limitations & Edge Cases

| ID | Component | Limitation / Behavior | Operational Workaround / Impact |
|---|---|---|---|
| **LIM-01** | `auth.py` | In-memory `ACTIVE_SESSIONS` storage resets on server restart | Sufficient for evaluation demo; production deployment requires Redis or JWT signing with RS256 |
| **LIM-02** | `graph_service.py` | 2-hop radial layout can produce overlapping peripheral nodes when >15 nodes are expanded simultaneously | Handled via viewport Pan & Zoom controls (`ZoomIn`, `ZoomOut`, `Reset View`) and alternative Forensic Table view |
| **LIM-03** | `CitizenLandingView.tsx` | Neighborhood road radar defaults to Ward K/East | Dynamic ward selector in top navbar updates the displayed neighborhood list |
| **LIM-04** | `RoadPassportView.tsx` | High-resolution contractor before/after photos use high-contrast synthetic civic research mockups | Real geotagged photo capture module ready for BMC mobile app API integration |

---

## 4. Production Roadmap Recommendations

1. **OAuth2 / Digilocker Citizen Authentication**:
   - Integrate Aadhaar/Digilocker for verified Mumbai voter status in JANMAT voting.
2. **PostGIS Spatial Clustering**:
   - Enhance the graph service with spatial bounding-box indexing to display geographic 500m buffers around road assets.
3. **Escrow Smart Contracts**:
   - Automate retainage escrow releases directly from 7-Stage citizen verification consensus thresholds.
