# Civic Budget Simulator — Capital Allocation & Knapsack Optimization

## 1. Overview

The Civic Budget Simulator allows citizens and ward executive engineers to test different infrastructure spending philosophies before sanctioning public funds. It applies integer-safe financial calculations and deterministic bounded optimization.

---

## 2. Pre-Configured Scenarios

1. **Balanced Ward Development**: Multi-criteria weighted allocation across all civic amenities.
2. **Safety First**: Prioritizes accident-prone corridors and vulnerable school zones.
3. **Healthcare and School Access**: Focuses entirely on road links serving hospitals and educational institutions.
4. **Flood Resilience**: Allocates resources to chronic waterlogging zones and stormwater drain desilting.
5. **Road Quality First**: Prioritizes structural durability and high-wear mastic asphalt overlays.
6. **Maximum Coverage**: Maximizes the total number of distinct projects funded under the budget ceiling.
7. **Cost Optimized**: Allocates lowest-cost high-utility interventions first.
8. **Citizen Priority**: Prioritizes proposals with the highest JANMAT resident upvotes.
9. **Custom Scenario**: User-defined budget allocations saved directly to the database.

---

## 3. Deterministic Bounded Optimization Model

The optimization engine implements a bounded multi-objective greedy knapsack baseline:

$$\text{Maximize } \sum_{i \in \text{Selected}} U_i$$
$$\text{Subject to } \sum_{i \in \text{Selected}} \text{Cost}_i \le \text{Budget} \times (1 - \text{Contingency Reserve})$$
$$\text{Mandatory Projects } \subseteq \text{Selected}$$

Where Utility $U_i$ is a linear combination of:
$$U_i = w_u \cdot \text{Urgency}_i + w_s \cdot \text{Safety}_i + w_f \cdot \text{Facility}_i + w_{fl} \cdot \text{Flood}_i + w_v \cdot \text{Votes}_i - \text{DLP Penalty}$$

Projects under active Defect Liability Period receive a significant penalty to ensure public money is not spent on defects the original contractor is legally obligated to repair.
