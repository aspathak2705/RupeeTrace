# RupeeTrace: Next Rupee Planner Methodology (`NEXT_RUPEE_METHODOLOGY.md`)

This document defines the transparent prioritization and budget-constrained allocation engine implemented in `next_rupee_service.py` (Engine 4).

---

## 1. Objective

Given a ward's remaining monsoon repair budget, where should the next rupee go?

RupeeTrace addresses this by prioritizing **actionable open citizen complaints** (`status in ['Open', 'In Progress']`) based on multi-criteria risk exposure, recommending durable rate-card backed repair methods, and allocating budget strictly within fiscal limits.

---

## 2. Multi-Criteria Risk Scoring Weights

Every candidate issue is evaluated on a normalized scale (0 to 100) across 7 objective factors:

| Risk Dimension | Weight | Metric & Evaluation Rule |
|---|---|---|
| **Issue Severity** | **25%** | Category severity weight: Road cave-in (100), Manhole (90), Waterlogging (80), Drain overflow (75), Pothole (65), Paver block (50), Other (30) |
| **Repeat Complaints** | **20%** | Number of unresolved complaints on segment + citizen upvotes count: $\min(100, 20 \times \text{count} + 5 \times \text{upvotes})$ |
| **Flood Exposure** | **15%** | Distance to nearest chronic flood hotspot: $\le 250\text{ m} \to 100$, $\le 500\text{ m} \to 80$, $\le 1000\text{ m} \to 50$, or ward `low_lying_index` $\times 70$ |
| **Rainfall / Tide Context** | **10%** | Ward drainage vulnerability and coastal high-tide exposure: $\text{low\_lying\_index} \times 100$ |
| **Traffic Exposure** | **10%** | Road peak congestion index + BEST bus route bonus: $\min(100, 8 \times \text{congestion} + 20 \times \text{bus\_route})$ |
| **Safety Exposure** | **10%** | Historical accident frequency on segment, with $2\times$ weight for accidents caused by potholes or waterlogging |
| **Nearby Facilities** | **10%** | Proximity to critical institutions: Emergency hospital (+50 pts), Municipal school (+25 pts) |

### Composite Priority Score
$$\text{Priority Score} = 0.25 S_{\text{sev}} + 0.20 S_{\text{rep}} + 0.15 S_{\text{flood}} + 0.10 S_{\text{rain}} + 0.10 S_{\text{traffic}} + 0.10 S_{\text{safety}} + 0.10 S_{\text{fac}}$$

---

## 3. Intervention Selection Matrix

RupeeTrace maps dominant complaint categories to physical repair methods supported by `rate_card.csv`:

| Reported Issue Category | Context Condition | Recommended Intervention | Standard Rate Card Benchmark | Estimated Cost |
|---|---|---|---|---|
| **Pothole** | High traffic / Bus route / Arterial | **Mastic asphalt** | ₹4,200 / sqm | ₹12,600 (3.0 sqm patch) |
| **Pothole** | Local road / Low traffic | **Hot mix patch** | ₹2,600 / sqm | ₹6,500 (2.5 sqm patch) |
| **Waterlogging** | Near chronic flood hotspot ($\le 500\text{ m}$) | **Dewatering pump deployed** | ₹60,000 / job | ₹60,000 |
| **Waterlogging** | Local road drainage block | **Drain desilting** | ₹90,000 / job | ₹90,000 |
| **Choked drain** | Any road | **Drain desilting** | ₹90,000 / job | ₹90,000 |
| **Broken paver blocks** | Pedestrian / Junction | **Paver blocks relaid** | ₹3,000 / sqm | ₹15,000 (5.0 sqm area) |
| **Open / broken manhole** | Any road | **Manhole cover replaced + grating** | ₹45,000 / job | ₹45,000 |
| **Road cave-in** | Arterial or local | **Excavation, pipeline repair, PQC patch** | ₹180,000 / job | ₹180,000 |
| **Vague / Road related / Other** | Unspecified | **Engineering review required** | TBD | `None` (Survey required) |

*Rule*: When evidence is insufficient, RupeeTrace returns `"Engineering review required"` rather than inventing an unverified repair method.

---

## 4. Fiscal Constraint & Greedy Budget Allocation

1. **Calculate Ward Remaining Budget**:
   $$R_W = \max(0, B_W - \sum \text{cost\_inr})$$
2. **Prioritization**: Sort candidate issues in descending order of Priority Score.
3. **Greedy Allocation**:
   - For each issue $k$ with estimated cost $C_k$:
     - If $C_k \le R_{\text{available}}$: Issue is tagged `"Recommended for Immediate Funding"`, and $R_{\text{available}} \leftarrow R_{\text{available}} - C_k$.
     - If $C_k$ is `None`: Tagged `"Pending Engineering Survey (Cost TBD)"`.
     - If $C_k > R_{\text{available}}$: Tagged `"Deferred (Exceeds Available Ward Budget)"`.
4. **Constraint Guarantee**: Total allocated recommendations never exceed remaining ward budget.
