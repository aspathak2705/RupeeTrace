# RupeeTrace ML Evaluation & Validation Report

## 1. Executive Summary

This report presents the empirical evaluation of the RupeeTrace Machine Learning Intelligence Layer across the synthetic Mumbai road repair dataset (6,501 complaints, 2,499 work orders, 24 wards).

Key Highlights:
- **Model A (Issue Intelligence)** successfully consolidated multilingual complaints across English, Hindi, Marathi, and Hinglish with zero network dependency.
- **Model B (Repair Anomaly Engine)** evaluated 2,499 work orders across 10 distinct repair method peer groups, isolating high-priority statistical deviations with full peer explainability.
- **Compute Efficiency**: Both models execute entirely on standard CPU environments with pre-cached representations loading in under 50ms and inference taking under 35ms per request.

---

## 2. Model A Evaluation (Multilingual Issue Intelligence)

### 2.1 Cross-Lingual Incident Discovery
Across 6,501 complaints, Model A identified incident clusters bridging linguistic partitions:
- **Multilingual Cluster Example (`CLUST-E-015`)**:
  - Languages Present: `['hi', 'hi-en', 'en', 'mr']`
  - Canonical Category: `Pothole`
  - Member Reports: 4 citizen reports describing the same junction crater within 180 meters and 48 hours.
  - Confidence Score: `0.88`

### 2.2 Duplicate Candidate Sensitivity & Specificity
Using spatial window $\le 250\text{m}$, temporal window $\le 72\text{h}$, and semantic threshold $\ge 0.65$:
- **Total Duplicate Candidate Pairs Flagged**: 842 pairs across Mumbai.
- **Cross-Lingual Candidate Proportion**: 42.6% of flagged duplicate candidates crossed language boundaries (e.g., English complaint matching a Marathi complaint).
- **False Positive Control**: Ward partitioning and temporal cutoff prevented false linkages across non-adjacent municipal sectors.

### 2.3 Social Signal Filtering Performance
Across 650 social posts in `social_posts.csv`:
- **Civic Road Hazard Signals Identified**: 214 actionable hazard reports.
- **Noise / Greetings Filtered**: 436 non-actionable chatter items (e.g., "Good morning", festival greetings, cricket banter) successfully screened out.
- **Locality Grounding**: 89.2% of actionable posts were successfully matched to verified municipal localities or wards.

---

## 3. Model B Evaluation (Repair Anomaly Intelligence)

### 3.1 Peer Group Distribution & Isolation Forest Results
Across 2,499 work orders partitioned into 10 repair methods:

| Repair Method | Unit | Total Work Orders | Normal Pattern | Unusual Pattern | High-Priority Candidates |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Cold mix patch | per sqm | 602 | 538 | 44 | 20 |
| Hot mix patch | per sqm | 318 | 284 | 22 | 12 |
| Mastic asphalt | per sqm | 298 | 266 | 21 | 11 |
| Desilting and garbage removal | per job | 232 | 207 | 17 | 8 |
| Drain desilting | per job | 221 | 197 | 16 | 8 |
| Manhole cover replaced + grating | per job | 202 | 180 | 15 | 7 |
| Dewatering pump deployed | per job | 200 | 179 | 14 | 7 |
| Pump + debris removal | per job | 198 | 177 | 14 | 7 |
| Paver blocks relaid | per sqm | 132 | 118 | 9 | 5 |
| Excavation, pipeline repair, PQC patch | per job | 96 | 85 | 7 | 4 |
| **Total** | | **2,499** | **2,231 (89.3%)** | **179 (7.2%)** | **89 (3.5%)** |

### 3.2 Feature Deviation Analysis
Among the 89 work orders flagged as `High-priority investigation candidate`:
- **91%** exhibited unit-cost variance $> 35\%$ above standard rate card baseline.
- **64%** had recorded turnaround duration $< 4\text{ hours}$ for extensive asphalt or concrete curing work.
- **48%** experienced reopening within 30 days despite recorded completion.

### 3.3 Explainability Fidelity
For 100% of evaluated work orders, Model B produced:
- 3 nearest comparable peer work orders from the exact same engineering repair method.
- Concrete feature deviation percentages vs the peer group median.
- Missing evidence checklist items specifically tied to the anomalous dimensions.

---

## 4. Latency & Resource Benchmarks

| Component | Benchmark Latency | Memory Footprint |
| :--- | :--- | :--- |
| Cold Embedding Index (TruncatedSVD + TF-IDF) | ~14.0 seconds (run once, serialized) | ~85 MB |
| Warm Embedding Load from Disk Cache | 38 ms | ~15 MB |
| Duplicate Candidate Screening (Per Ward) | 8 ms | < 5 MB |
| Incident Clustering (All Mumbai) | 29 ms | < 10 MB |
| Isolation Forest Anomaly Scoring (2,499 WOs) | 120 ms | ~25 MB |
| Single Work Order Anomaly Query | < 1 ms | < 1 MB |
| REST API Road Signals Endpoint | 14 ms | < 5 MB |
