# Model Card: Context-Aware Repair Anomaly Intelligence (Model B)

## 1. Model Details
- **Model Name**: RupeeTrace Context-Aware Repair Anomaly Engine (Model B)
- **Model Version**: 1.0.0
- **Model Date**: November 2026
- **Algorithm**: `sklearn.ensemble.IsolationForest` fitted per peer group ($n=100$, contamination $= 0.06$) with robust multi-feature MAD fallback.
- **Peer Group Definition**: Partitioned strictly by `repair_method` and rate card unit (`per_sqm` vs `per_job`).

---

## 2. Intended Use
- **Primary Use Case**: Unsupervised detection of unusual cost, turnaround duration, or durability patterns across municipal road repair work orders.
- **Target Users**: Municipal road auditors, Chief Accounts Officers, and civic accountability platforms.
- **Out of Scope**: Presuming fraud, claiming criminal corruption, or blacklisting contractors automatically. All outputs serve strictly as investigative screening flags.

---

## 3. Input Features (8 Dimensions)
1. `unit_cost`: Cost per square meter for surface works; total billed cost for discrete job items.
2. `variance_pct`: Percentage deviation from the standard municipal rate card baseline.
3. `area_sqm`: Measured repair surface area in square meters.
4. `duration_hours`: Elapsed execution time between work start and completion.
5. `sla_met`: Binary compliance with target service level agreement.
6. `reopened_within_30d`: Binary durability failure indicator within 30 days of completion.
7. `flood_index`: Ward environmental vulnerability index.
8. `contractor_volume`: Number of active jobs awarded to the contractor in the ward.

---

## 4. Classification & Explanation Output
- **3-Tier Neutral Screening**:
  - `Normal pattern` ($\text{score} < 0.45$)
  - `Unusual pattern` ($0.45 \le \text{score} < 0.70$)
  - `High-priority investigation candidate` ($\text{score} \ge 0.70$)
- **Comparable Peers**: Top 3-5 nearest work orders in normalized feature space from the same repair method group.
- **Differentiating Feature Deviations**: Explicit percentage difference and direction compared to peer group median.
- **Missing Verification Checklist**: Concrete procedural documents to inspect (e.g., asphalt weighbridge receipts, post-cure core compression tests).
- **Recommended Action**: Constructive, non-accusatory administrative next step.

---

## 5. Strict Neutrality Guarantee
The model output schema enforces strict neutral vocabulary. Words such as *"fraud"*, *"corrupt"*, *"illegal"*, *"criminal"*, *"fake"*, or *"scam"* are programmatically excluded from all classification and recommendation strings.

---

## 6. Limitations & Caveats
- Outlier scores may reflect legitimate engineering complexities (e.g., unmapped subsurface utility conflicts, night shifts during torrential rain, or traffic police staging constraints).
- Small peer groups ($N < 15$) revert to robust non-parametric distance calculations to avoid statistical over-sensitivity.
