# RupeeTrace ML Intelligence Architecture

## 1. System Mission & Philosophy

RupeeTrace operates on a foundational civic-finance premise:
> **"Deterministic financial rules track where money was billed; lightweight applied ML uncovers hidden operational patterns and cross-language civic signals that static rules miss."**

The ML intelligence layer is not introduced for cosmetic decoration. It is intentionally designed as two specialized, production-conscious models operating strictly within defined statistical boundaries:
- **Model A**: Multilingual Issue Intelligence (Unifies citizen reports across English, Hindi, Marathi, and Hinglish; screens duplicate candidates; extracts actionable social media hazard reports).
- **Model B**: Context-Aware Repair Anomaly Intelligence (Uses peer-group partitioned Isolation Forests to screen unusual expenditure and turnaround patterns without presuming fraud).

```
+---------------------------------------------------------------------------------------------------+
|                                        RupeeTrace Application                                     |
+---------------------------------------------------------------------------------------------------+
                                                  |
           +--------------------------------------+--------------------------------------+
           |                                                                             |
           v                                                                             v
+------------------------------------+                         +------------------------------------+
|    MODEL A: ISSUE INTELLIGENCE     |                         |     MODEL B: REPAIR ANOMALIES      |
|  (Multilingual MiniLM + SVD + Geo) |                         |   (Peer Group Isolation Forest)    |
+------------------------------------+                         +------------------------------------+
| • 384-dim semantic embeddings      |                         | • Partitioned by repair method     |
| • English, Hindi, Marathi, Hinglish|                         | • Unit-aware cost (sqm vs job)     |
| • Spatial (<=250m) & Time (<=72h)  |                         | • Z-score feature deviations       |
| • Cross-lingual incident clusters  |                         | • Missing evidence checklist       |
| • Actionable social signal filter  |                         | • Strictly neutral classification  |
+------------------------------------+                         +------------------------------------+
           |                                                                             |
           +--------------------------------------+--------------------------------------+
                                                  |
                                                  v
                      +--------------------------------------------------------+
                      |               Integration Touchpoints                  |
                      | • Road Passport (Chapter 07: ML Intelligence)          |
                      | • Visual Money Trace Graph ([MODEL-SUGGESTED] Edges)   |
                      | • Combined Repair Auditor ([ML IsolationForest] Tags)  |
                      | • REST Endpoints (/api/intelligence/*)                 |
                      +--------------------------------------------------------+
```

---

## 2. Model A — Multilingual Issue Intelligence Architecture

### 2.1 Embedding Engine & Dual-Path Architecture
- **Primary Model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384-dimensional dense semantic vectors).
- **Zero-Network Fallback Engine**: If environment network access is restricted or local model weights are absent, a high-performance offline multilingual semantic embedder automatically engages:
  - Generates character 2-4 n-grams and word n-grams with Devanagari and Latin sublinear TF-IDF.
  - Applies domain lexicon boosting for Mumbai municipal infrastructure terminology across English, Hindi, Marathi, and Hinglish (e.g., *pothole, khadda, gaddha, खड्डा, पाणी, जलभराव, manhole, dhakkan, पेव्हर ब्लॉक*).
  - Projects to exact 384 dimensions via `TruncatedSVD` and normalizes with unit $L_2$ norm.
- **Cache Persistence**: Vectors are serialized to `rupeetrace/data/cache/complaint_embeddings.npz` with complaint ID checksums. Subsequent application boots load embeddings in $< 50\text{ms}$.

### 2.2 Multi-Signal Candidate Duplicate Detection
Candidate duplicate detection screens whether two complaints describe the same physical street defect without altering or deleting source records:
$$\text{Score}_{\text{composite}} = 0.40 \cdot S_{\text{semantic}} + 0.30 \cdot S_{\text{spatial}} + 0.15 \cdot S_{\text{temporal}} + 0.10 \cdot S_{\text{category}} + 0.05 \cdot S_{\text{locality}}$$

Where:
- $S_{\text{semantic}} = \cos(\mathbf{e}_1, \mathbf{e}_2) \in [0, 1]$
- $S_{\text{spatial}} = \max\left(0, 1 - \frac{\text{dist}_{\text{haversine}}}{250\text{m}}\right)$
- $S_{\text{temporal}} = \max\left(0, 1 - \frac{|\Delta t|}{72\text{ hours}}\right)$
- $S_{\text{category}} = 1.0$ if identical, $0.4$ if related defect
- $S_{\text{locality}} = 1.0$ if exact text match, $0.5$ if related

### 2.3 Graph-Connected Incident Clustering
Complaints with mutual candidate duplicate links ($\text{Score} \ge 0.60$) within a municipal ward form an adjacency graph. Connected components are partitioned into incident clusters:
- Representative text selection (highest upvotes and descriptive completeness).
- Language inventory detection (`languages_present`: e.g., `['en', 'mr', 'hi-en']`).
- Centroid GPS coordinates and bounding temporal range.

---

## 3. Model B — Context-Aware Repair Anomaly Detection Architecture

### 3.1 Peer Group Partitioning
To avoid comparing dissimilar construction operations (e.g., small per-job manhole cover replacements vs extensive per-sqm mastic asphalt highway resurfacing), work orders are partitioned strictly by `repair_method` and rate card billing unit (`per_sqm` vs `per_job`).

### 3.2 Feature Engineering Pipeline
For each work order $i$:
1. **Unit-Aware Cost**:
   $$\text{UnitCost}_i = \begin{cases} \frac{\text{cost\_inr}_i}{\max(1.0, \text{area\_sqm}_i)} & \text{if unit is per sqm} \\ \text{cost\_inr}_i & \text{if unit is per job} \end{cases}$$
2. **Rate Card Variance %**:
   $$\text{VariancePct}_i = \frac{\text{UnitCost}_i - \text{StandardRate}}{\text{StandardRate}} \times 100$$
3. **Reported Area**: $\text{area\_sqm}_i$
4. **Turnaround Duration**: $(\text{completed\_at} - \text{work\_started\_at})$ in hours
5. **SLA Execution**: $1.0$ if SLA met, $0.0$ if breached
6. **Reopening Within 30 Days**: $1.0$ if reopened, $0.0$ otherwise
7. **Ward Flood Exposure**: Ward's low-lying index ($0.0$ to $10.0$)
8. **Contractor Workload Volume**: Number of active jobs assigned to the contractor in the same ward

### 3.3 Isolation Forest Modeling
- Fit `sklearn.ensemble.IsolationForest(n_estimators=100, contamination=0.06, random_state=42)` on standard-scaled peer features.
- If peer group size $N < 15$, apply robust Median Absolute Deviation (MAD) multi-feature distance fallback.
- Convert raw decision function scores into normalized anomaly confidence $\in [0, 1]$.

### 3.4 Neutral 3-Tier Classification
- **Normal pattern** ($\text{score} < 0.45$): Aligns with statistical peer baseline.
- **Unusual pattern** ($0.45 \le \text{score} < 0.70$): Requires site supervisor logbook review.
- **High-priority investigation candidate** ($\text{score} \ge 0.70$): Marked for measurement sheet inspection and plant weighbridge verification.

---

## 4. Provenance & Audit Integrity

Every data point and finding surfaced in RupeeTrace maintains explicit provenance separation:
- `[Deterministic]`: Rule-based rate card bounds, duplicate work order IDs, defect liability period overlaps.
- `[Statistical]`: Group aggregations, ward budget utilization percentages, contractor rating tiers.
- `[ML IsolationForest]`: Contextual peer-group anomalies flagged by Model B.
- `model-suggested`: Edges, duplicate candidates, and incident clusters generated by Model A.

No raw civic record is ever overwritten, merged, or deleted by machine learning predictions.
