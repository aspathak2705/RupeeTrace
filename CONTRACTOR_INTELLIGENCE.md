# Contractor Intelligence & Tender Workspace

## 1. Primary Mandate

> **"Which contractors have the strongest evidence-backed record for this particular type of work?"**

Contractor Intelligence abandons universal contractor rankings. Instead, it evaluates contractors strictly within **comparable project categories** (e.g., Mastic asphalt, Paver blocks relaid, Drain desilting, Concrete PQC).

---

## 2. Empirical Performance Dimensions

Calculated from observed work-order records (`work_orders.csv`):
- **Category Completed Jobs**: Total historical projects completed in that engineering discipline.
- **Cost Efficiency**: Average job cost compared to standard rate card baseline.
- **SLA Adherence**: Proportion of jobs delivered within sanctioned SLA timeline.
- **30-Day Reopened Rate**: Frequency of repairs that failed and were reopened within 30 days.
- **DLP Breaches**: Number of documented warranty failures.
- **Active Workload Burden**: Total concurrent open work orders across all Mumbai wards.

---

## 3. Tender Evaluation Workspace

The tender advisor allows demo officers to configure pre-declared procurement criteria:
- **Financial Weighting** (40%): Evaluated as $(\text{Lowest Eligible Bid} / \text{Quoted Amount}) \times 100$.
- **Technical Quality** (35%): Grounded in historical durability and category suitability score.
- **Delivery Timeline** (15%): Evaluated against sanctioned execution schedule.
- **Extended DLP Warranty** (10%): Rewarding contractors offering >24 months defect liability.

Bidders are ranked deterministically (L1 through L4). The output is labeled:
`Decision Support Only — Not an Official Municipal Tender Award`.
