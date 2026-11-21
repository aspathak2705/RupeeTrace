# RupeeTrace: Money Trail Methodology (`MONEY_TRAIL_METHODOLOGY.md`)

This document defines the financial accounting and drill-down methodology implemented in `money_trail_service.py` (Engine 1).

---

## 1. Core Financial Terminology

To maintain strict accountability and avoid legal mischaracterization:
* **"Recorded work-order expenditure"**: Total rupee amount documented in completed work order records.
* **"Recorded billed cost"**: The contractor's billed amount submitted per job.
* **"Remaining budget estimate"**: Ward monsoon road repair budget minus recorded work-order expenditure.
* **"Budget context"**: Synthetic budget figure sized against monsoon repairs in `wards.csv`.

> ⚠️ RupeeTrace never characterizes synthetic recorded costs as verified treasury payments. No bank statements or payment vouchers exist in the dataset.

---

## 2. Ward-Level Financial Reconciliation

For any ward $W$:

1. **Total Ward Budget**:
   $$B_W = \text{monsoon\_repair\_budget\_inr\_2025}$$
2. **Total Recorded Expenditure**:
   $$E_W = \sum_{i \in \text{WorkOrders}_W} \text{cost\_inr}_i$$
3. **Remaining Budget Estimate**:
   $$R_W = B_W - E_W$$
4. **Budget Utilization Percentage**:
   $$U_W = \left(\frac{E_W}{B_W}\right) \times 100$$
5. **Reopened Expenditure**:
   $$E_{\text{reopened}} = \sum_{i \in \text{WorkOrders}_W, \text{reopened}_i = \text{True}} \text{cost\_inr}_i$$
6. **DLP Breach Expenditure**:
   $$E_{\text{DLP}} = \sum_{i \in \text{WorkOrders}_W, \text{road\_under\_dlp}_i = \text{True}} \text{cost\_inr}_i$$

---

## 3. Contractor Expenditure Aggregation

For each contractor $C$ operating in ward $W$ (or city-wide):

* **Total Recorded Billed Cost**:
  $$E_C = \sum_{i \in \text{WorkOrders}_C} \text{cost\_inr}_i$$
* **Average Job Cost**:
  $$\bar{E}_C = \frac{E_C}{N_C}$$
* **Reopened Jobs Expenditure**: Rupee value of repairs executed by contractor $C$ that failed within 30 days.
* **Drill-Down Guarantee**: Every aggregate retains the exact list of constituent `work_order_id` values.

---

## 4. Road-Level Financial History

For each road asset $R$:

* **Chronological Ledger**: All work orders ordered by `assigned_at` / `completed_at`.
* **Repeat Repair Indicator**: Flagged when total work orders on segment $N_R > 1$.
* **DLP Warranty Breach Spend**: Rupee amount billed for work on road $R$ while under warranty (`under_dlp == 'Y'`).
