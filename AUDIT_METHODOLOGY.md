# RupeeTrace Audit & Scoring Methodology

This document details the mathematical models and deterministic formulas used by the four RupeeTrace financial intelligence engines.

---

## 1. Engine 1: Money Trail Engine

### Budget Utilization
$$\text{Budget Utilization (\%)} = \left( \frac{\sum \text{cost\_inr}_{\text{recorded}}}{\text{monsoon\_repair\_budget\_inr\_2025}} \right) \times 100$$

### Reopened Expenditure
$$\text{Reopened Expenditure} = \sum_{\text{reopened\_within\_30d} = \text{True}} \text{cost\_inr}$$

---

## 2. Engine 2: Repair Auditor

### A. Rate-Card Deviation Screening
For per-square-metre repairs:
$$\text{Expected Cost} = \text{area\_sqm} \times \text{standard\_rate\_inr}$$
For fixed per-job repairs:
$$\text{Expected Cost} = \text{standard\_rate\_inr}$$
$$\text{Deviation (\%)} = \left( \frac{\text{billed\_cost\_inr} - \text{Expected Cost}}{\text{Expected Cost}} \right) \times 100$$

- **Screening Bands**:
  - `20% – 30%`: Moderate review required (may reflect site-specific dewatering or traffic diversion).
  - `> 30%`: High priority review (requires examination of Measurement Book entries).

### B. Duplicate Work Order Detection
Identifies candidate duplicate pairs using:
- Same `road_id`.
- Same `repair_method`.
- Completed within $\le 14$ days of each other.
- No shared complaint IDs (indicates redundant administrative sanction rather than combined citizen response).

### C. DLP Warranty Breach
Identifies work orders where:
$$\text{road.under\_dlp} = \text{True} \quad \text{AND} \quad \text{cost\_inr} > 0$$
Flags potential municipal expenditure on repairs that should legally be covered under the contractor's Defect Liability Period warranty.

---

## 3. Engine 3: Fair Contractor Accountability

### Composite Score Formula (0 to 100)
$$\text{Score} = (0.30 \times S_{\text{SLA}}) + (0.30 \times S_{\text{Durability}}) + (0.25 \times S_{\text{Cost}}) + (0.15 \times S_{\text{Repeat}})$$

### Environmental Adversity Calibration
To prevent unfair penalties against contractors operating in flood-prone wards:
$$\text{Adversity Moderation} = 1.0 + (0.15 \times \text{average\_ward\_low\_lying\_index})$$
The raw reopen rate penalty is dampened by the adversity factor:
$$\text{Adjusted Reopen Rate} = \frac{\text{Raw Reopen Rate}}{\text{Adversity Moderation}}$$

### Rating Tiers
- **Good Standing**: $\ge 80.0$
- **Standard Performance**: $65.0 - 79.9$
- **Review Recommended**: $50.0 - 64.9$
- **High Scrutiny**: $< 50.0$

---

## 4. Engine 4: Next Rupee Priority Allocation

### Priority Score (0 to 100)
$$\text{Priority Score} = \sum_{i=1}^{7} (w_i \times f_i)$$

Where factors $f_i \in [0, 100]$:
1. **Issue Severity** ($w = 0.15$): Severity of reported defect (Crater/Cave-in = 100, Pothole = 80, Uneven = 60).
2. **Citizen Urgency** ($w = 0.25$): Volume of repeated open complaints on the asset.
3. **Flood Hotspot Exposure** ($w = 0.15$): Proximity and depth of nearest flood hotspot.
4. **Rain & Tide Exposure** ($w = 0.10$): Ward monsoon rainfall intensity and high tide risk.
5. **Traffic Exposure** ($w = 0.15$): Peak-hour congestion index and bus route density.
6. **Safety & Accident Exposure** ($w = 0.10$): Historical accident frequency on the road.
7. **Critical Facilities Proximity** ($w = 0.10$): Density of nearby hospitals and schools.

### Greedy Allocation
Interventions are sorted descending by Priority Score. Available remaining ward budget is committed sequentially until exhausted. Unfunded issues receive the status `Deferred (Budget Cap Reached)`.
