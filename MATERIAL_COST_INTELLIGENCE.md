# Material & Cost Intelligence — Engineering Optimization

## 1. Core Principle

> **"Find the most economical way to deliver the required engineering outcome — never choose the cheapest material blindly."**

This module optimizes infrastructure expenditure by comparing alternative construction specifications conforming to Indian Roads Congress (IRC), Bureau of Indian Standards (IS), and Ministry of Road Transport & Highways (MoRTH) standards.

---

## 2. Engineering Alternatives Database

### A. Pothole & Surface Wearing Course
- **Baseline**: Standard Hot Mix Asphalt VG-30 (IS:73-2013) — ₹2,600/sqm, 2-yr lifespan.
- **Alternative 1**: Mastic Asphalt with Pre-coated Chippings (IRC:SP:98-2020) — ₹4,200/sqm, 6-yr lifespan, 9.5/10 monsoon resilience, **11.2% lower 5-year lifecycle cost**.
- **Alternative 2**: High-Performance Polymer-Modified Cold Mix (IRC:116-2014) — ₹1,800/sqm, instant wet-weather emergency deployment.
- **Alternative 3**: 25% Reclaimed Asphalt Pavement (RAP) with WMA (IRC:120-2015) — ₹2,150/sqm, **17.3% lifecycle savings**.

### B. Pavement & Junction Upgradation
- **Baseline**: Bituminous Concrete 50mm over DBM (MoRTH Section 500) — ₹3,400/sqm.
- **Alternative 1**: Interlocking Concrete Pavers M-40 (IS:15658-2021) — ₹3,000/sqm, **33.8% lifecycle savings**, modular utility trench relaying.
- **Alternative 2**: Ultra-Thin White-topping (IRC:SP:76-2015) — ₹5,500/sqm, 15-yr lifespan, impervious to waterlogging.

### C. Stormwater Drainage Conduits
- **Baseline**: In-situ Brick Masonry Side Drain — ₹3,500/m.
- **Alternative 1**: Modular Precast RCC Box Drains (IS:458) — ₹5,200/m, **20.6% lifecycle savings**, rapid crane installation.
- **Alternative 2**: Corrugated Double Wall (DWC) HDPE Pipes (IS:16098) — ₹4,100/m, Manning $n=0.009$, **37.4% lifecycle savings**.

---

## 3. Claude AI-Assisted Research Layer

- **Input**: Project category, road surface, and ward rainfall context.
- **Output**: Structured JSON citing relevant IRC/IS/MoRTH standards, trade-offs, and human validation prerequisites.
- **Graceful Fallback**: If `ANTHROPIC_API_KEY` is not configured, the system seamlessly serves the local deterministic engineering knowledge base without failing.
