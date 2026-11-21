# RupeeTrace: Repair Auditor Rules (`AUDIT_RULES.md`)

This document outlines the four independent deterministic audit checks implemented in `audit_service.py`.

---

## 1. Check A: Rate-Card Deviation Screening

### Purpose
To identify work orders where the recorded billed cost diverges significantly from the standardized BMC rate card benchmark.

### Calculation
Join `work_orders.repair_method` to `rate_card.repair_method`.
Read `rate_card.unit`.

- **For per-square-metre work** (`unit == 'per sqm'`):
  $$\text{Expected Cost} = \text{area\_sqm} \times \text{standard\_rate\_inr}$$
- **For per-job work** (`unit == 'per job'`):
  $$\text{Expected Cost} = \text{standard\_rate\_inr}$$

Compute percentage deviation:
$$\text{Deviation \%} = \frac{\text{cost\_inr} - \text{Expected Cost}}{\text{Expected Cost}} \times 100$$

### Screening Thresholds
Dataset guidance notes that normal operational jobs vary by approximately 20% to 30%.
- **Normal Variation**: $\le 20.0\%$ (No flag generated).
- **Warning Band**: $20.0\% < \text{Deviation} \le 30.0\%$
  - Status: `Needs review`
  - Severity: `MEDIUM`
- **High Deviation Band**: $\text{Deviation} > 30.0\%$
  - Status: `High priority review`
  - Severity: `HIGH`

### Neutral Framing & Limitations
Deviations represent screening indicators, not legal proof of overbilling or fraud. Legitimate variances may arise from emergency night-time work, deep de-watering, or unpaved sub-base preparation.

---

## 2. Check B: Possible Duplicate Work Orders

### Purpose
To flag candidate redundant billing on the same road segment within close timeframes.

### Matching Rule
Conservative matching criteria:
1. Exact match on `road_id`.
2. Exact match on `repair_method`.
3. Completion dates within 14 calendar days:
   $$\Delta t = |\text{completed\_at}_2 - \text{completed\_at}_1| \le 14\text{ days}$$
4. Zero shared complaints between the two work orders ($\text{complaints}_1 \cap \text{complaints}_2 = \emptyset$).

### Severity Assignment
- If executed by the **same contractor** and $\Delta t \le 7\text{ days}$:
  - Status: `High priority review`
  - Severity: `HIGH`
- Otherwise:
  - Status: `Needs review`
  - Severity: `MEDIUM`

### Recommended Action
Inspect chainage logs and contractor GPS timestamped site photographs to determine whether jobs repaired distinct spots on the road segment.

---

## 3. Check C: Defect Liability Period (DLP) Expenditure

### Purpose
To identify public funds billed for road repairs on assets covered under contractor warranty.

### Rule
Join `work_orders.road_id` to `roads.road_id`.
Flag where `roads.under_dlp == 'Y'` and `work_orders.cost_inr > 0`.

### Required Label
*"Recorded work on a road marked under DLP — contract/warranty review required."*

### Status & Severity
- If billed cost $\ge ₹50,000$: Status `High priority review`, Severity `HIGH`.
- If billed cost $< ₹50,000$: Status `Needs review`, Severity `MEDIUM`.

### Limitations
Certain utility trenching cuts (e.g., Mahanagar Gas, Adani Electricity, hydraulic pipeline repairs) or third-party damage may require emergency BMC funding outside contractor warranty scope.

---

## 4. Check D: SLA & Repair Durability Breach

### Purpose
To evaluate timely completion and post-repair physical longevity.

### Durability Rule (Early Failure)
- Flag work orders where `reopened_within_30d == True`.
- Status: `High priority review`, Severity: `HIGH`.
- Reason: Repair recorded as completed but reopened within 30 days. Demonstrates rapid surface failure under monsoon traffic.

### SLA Compliance Rule
- Flag work orders where `sla_met == False`.
- Status: `Needs review`, Severity: `MEDIUM`.
- Target SLA hours:
  - Severity 5 issues: 24 hours
  - Severity 1 issues: 168 hours
- Reason: Work order completion exceeded target SLA timeframe.
