# RupeeTrace: Fair Accountability Methodology (`ACCOUNTABILITY_METHODOLOGY.md`)

This document defines the contractor scorecard methodology and contextual normalization implemented in `accountability_service.py` (Engine 3).

---

## 1. Scorecard Architecture & Weights

Initial product weights (MVP specification):

| Component | Weight | Focus Area |
|---|---|---|
| **SLA Performance** | **30%** | Responsiveness and adherence to completion deadlines |
| **Repair Durability** | **30%** | Quality of materials and resistance to 30-day failure |
| **Cost Efficiency** | **25%** | Adherence to standard rate-card benchmarks |
| **Repeat-Repair Burden** | **15%** | Minimizing chronic repeat repairs on identical segments |

All sub-scores are normalized on a standardized scale of **0.0 to 100.0**.

---

## 2. Mathematical Formulations

Let $N$ be the total work orders completed by contractor $C$.

### A. SLA Performance Score ($S_{\text{SLA}}$, 30%)
$$S_{\text{SLA}} = \left(\frac{\sum \text{sla\_met}}{N}\right) \times 100$$

### B. Repair Durability Score ($S_{\text{Dur}}$, 30%)
Penalizes contractor for premature road failure within 30 days:
$$\text{Reopen Rate} = \left(\frac{\sum \text{reopened\_within\_30d}}{N}\right) \times 100$$
$$S_{\text{Dur}} = \max\left(0.0, 100.0 - (\text{Reopen Rate} \times 3.0)\right)$$

### C. Cost Efficiency Score ($S_{\text{Cost}}$, 25%)
Measures average deviation above rate card benchmark:
$$\bar{\Delta}_{\text{variance}} = \frac{1}{N} \sum \max(0.0, \text{cost\_variance\_pct}_i)$$
$$S_{\text{Cost}} = \max\left(0.0, \min\left(100.0, 100.0 - \max(0.0, \bar{\Delta}_{\text{variance}} - 5.0) \times 2.5\right)\right)$$

### D. Repeat-Repair Burden Score ($S_{\text{Repeat}}$, 15%)
Calculates the proportion of jobs executed on roads where the contractor had multiple interventions:
$$\text{Repeat Burden \%} = \left(\frac{\text{Jobs on Repeated Segments}}{N}\right) \times 100$$
$$S_{\text{Repeat}} = \max\left(0.0, 100.0 - (\text{Repeat Burden \%} \times 0.4)\right)$$

### Composite Score ($S_{\text{Composite}}$)
$$S_{\text{Composite}} = 0.30 S_{\text{SLA}} + 0.30 S_{\text{Dur}} + 0.25 S_{\text{Cost}} + 0.15 S_{\text{Repeat}}$$

---

## 3. Contextual Fairness Principles

A fair accountability system must not punish contractors simply for operating in harsh environmental conditions.

1. **Low-Lying Ward Context**: For every contractor, RupeeTrace calculates the weighted average `low_lying_index` across their active wards. Contractors operating in low-lying wards (e.g. F/N, L, M/E) experience prolonged water submergence, which accelerates bitumen debonding independently of contractor workmanship.
2. **Sample Size Safeguards**: If a contractor has fewer than 30 work orders, a prominent `sample_size_warning` is displayed to prevent drawing statistical conclusions from small samples.
3. **Rating Tiers**:
   - `85.0 – 100.0`: **Good Standing**
   - `70.0 – 84.9`: **Standard Performance**
   - `50.0 – 69.9`: **Under Observation**
   - `< 50.0`: **Requires Administrative Review**
