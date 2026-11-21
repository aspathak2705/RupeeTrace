# RupeeTrace — Remaining UX & Functional Notes

**Version:** 2.0  
**Status:** Ready for Hackathon Presentation & Production Deployment

---

## 1. Discovered Edge Cases & Architectural Recommendations

1. **Graph WebGL Performance on Ultra-Low-Spec Mobile Devices:**
   - *Observation:* Rendering the force-directed canvas with > 200 nodes on low-power mobile devices can experience slight frame drops during fast pinch-to-zoom.
   - *Mitigation Implemented:* The redesigned Investigate view defaults to progressive disclosure with a max work-order threshold (8 nodes) and provides an instant one-click toggle to the **Structured Forensic Ledger (Table View)**.

2. **Ward Slashes in Direct Browser Bookmarking:**
   - *Observation:* When users share URLs with unencoded slashes in query parameters or hashes, certain third-party chat apps may split the URL.
   - *Mitigation Implemented:* The backend implements dual-route pathing (`/{ward_code}` and `/{ward_prefix}/{ward_suffix}`) alongside `urllib.parse.unquote`, ensuring both encoded (`K%2FE`) and unencoded (`K/E`) URLs resolve without 404s.

3. **Offline AI Assistant Response Quality:**
   - *Observation:* When running without an active `ANTHROPIC_API_KEY`, the assistant operates in local retrieval-first mode.
   - *Mitigation Implemented:* Local deterministic response synthesizers format accurate financial figures, citations, and ward audit numbers directly from loaded CSV/SQLite data across English, Hindi, and Marathi queries.

---

## 2. Completed Milestones

- [x] Fix Starlette 404 on ward codes with slashes (`K/E`, `F/N`, `P/S`).
- [x] Fix Pydantic 500 validation crashes on `RoadDetailResponse` and `WardDetailResponse`.
- [x] Standardize application into 5 core destinations (`Overview`, `Investigate`, `Accountability`, `Next Rupee`, `Public Portal`).
- [x] Unify global AI Assistant drawer triggered from header and `⌘K` / `Ctrl+K`.
- [x] Implement 7-stage citizen repair verification with Before/After photo inspection.
- [x] Implement Knapsack budget simulator and IRC:SP:98 material cost optimization.
- [x] Full TypeScript compilation and production bundle build with 0 errors.
