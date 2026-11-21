# RupeeTrace Demonstration Guide & 4-Minute Presentation Script

**Theme**: "Follow the Rupee: Where did Mumbai's road repair money go?"

---

## 🎯 Featured Demonstration Records (Pre-Verified)

| Entity Type | Record ID | Details | Purpose in Demo |
| :--- | :--- | :--- | :--- |
| **Primary Road** | `RD0140` | Marol Maroshi Road, Ward K/E (Asphalt, 381m, 2 lanes) | Signature Road Passport |
| **Primary Work Order** | `WO25-00600` | Manhole cover replaced + grating (Contractor: CT03) | Rate-card deviation audit (+129.5% variance) |
| **Linked Complaints** | `BMC25-001580`, `BMC25-001581` | Citizen reports of broken manhole & water ingress | Originating citizen evidence |
| **Backup Work Order** | `WO25-00457` | Road: `RD0142` (Under active DLP warranty, Contractor: CT06) | DLP warranty breach audit |
| **Featured Ward** | `Ward K/E` | Budget: ₹3.00 Cr, Low-lying waterlogging index: 0.68 | Ward Money Trail & Next Rupee Plan |

---

## ⏱️ Four-Minute Demo Script

### 0:00 – 0:40 | Ward Money Trail
- **Action**: Click **"1. Ward Trail"** on the Demo Tour Bar (or select Ward K/E in dropdown).
- **Narrative**:
  > *"Where did Ward K/East's road repair money go? RupeeTrace starts at the municipal budget level. Here, Ward K/E was allocated ₹3.00 Crores for the 2025 monsoon. We immediately reconcile this against ₹2.47 Crores in recorded billed work orders across 8 empanelled contractors, highlighting that 18% of expenditure is tied to jobs that reopened within 30 days."*

### 0:40 – 1:35 | Road Passport & Visual Money Trace Graph
- **Action**: Click **"2. Road Passport"** (opens `/passport/RD0140`).
- **Narrative**:
  > *"Every road in Mumbai receives a persistent Public Road Passport. For Marol Maroshi Road (RD0140), citizens see its documented engineering specifications, its complete citizen complaint history, and its repair timeline. Citizens scanning an on-site QR code reach this exact page."*
- **Action**: Click **"3. Trace Graph"** (or click 'Trace in Visual Graph').
- **Narrative**:
  > *"Our Visual Money Trace Graph maps the multi-hop financial chain: from citizen complaints to work orders, contractors, and audit flags. Every node and link cites its exact source file and record ID."*

### 1:35 – 2:20 | Work Order Audit Investigation
- **Action**: Click **"4. Audit Flag"** (opens Work Order Evidence Modal for `WO25-00600`).
- **Narrative**:
  > *"The Repair Auditor automatically screens recorded costs against the municipal schedule of rates. For Work Order WO25-00600, the contractor billed ₹1,03,257 for a manhole cover replacement against a standard benchmark of ₹45,000—a deterministic deviation of +129.5%. We highlight this as a screening review flag and identify missing physical measurement books and material batch delivery test certificates."*

### 2:20 – 3:05 | Fair Contractor Accountability
- **Action**: Click **"5. Contractors"** (opens Contractor Scorecards).
- **Narrative**:
  > *"Traditional audits crudely penalize contractors. RupeeTrace introduces Fair Accountability. We evaluate contractors across SLA speed, 30-day durability, rate-card adherence, and repeat repair burden—adjusted for ward environmental difficulty. Contractors operating in flood-prone, low-lying wards like K/East or G/North receive contextual calibration rather than unfair penalties."*

### 3:05 – 3:40 | Citizen & Municipal Officer Shared Dialogue
- **Action**: Click **"6. Case Dialogue"** (opens Cases view).
- **Narrative**:
  > *"Accountability requires closure. In Citizen mode, residents log field observations when a pothole reopens. Switching the toggle to Officer mode reveals the executive engineer console, where the ward engineer reviews the complaint, cites warranty clauses, and sanctions remedial contractor action."*

### 3:40 – 4:00 | Next Rupee Capital Allocation Planner
- **Action**: Click **"7. Next Rupee"** (opens Next Rupee Planner).
- **Narrative**:
  > *"Finally, we fund what matters. The Next Rupee Planner uses a greedy optimization model that prioritizes unresolved citizen defects based on issue severity, traffic volume, and proximity to hospitals and schools. It outputs tailored physical engineering interventions—such as mastic asphalt or dewatering pumps—until the available ward budget is optimally allocated."*

---

## 🤖 Multilingual AI Assistant Demonstration

Click **"Ask AI Assistant"** on the bottom right and test these live queries:
1. **English**: `"How much was recorded for WO25-00600 on RD0140?"`
2. **Hindi**: `"कार्य आदेश WO25-00600 पर कितना खर्च दर्ज हुआ?"`
3. **Marathi**: `"रस्ता RD0140 वर किती खर्च नोंदवला आहे आणि कंत्राटदार कोण आहे?"`
4. **Hinglish**: `"RD0140 ka total kharcha kitna hai aur kya yeh DLP me hai?"`

Each answer provides:
- Grounded explanation with exact rupees.
- Cited source file and record IDs.
- Missing evidence warnings (e.g., absence of raw bitumen batch receipts or treasury payment scrolls).
- Concrete recommended engineering next action.
