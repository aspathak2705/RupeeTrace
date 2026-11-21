# RupeeTrace — Visual Money Trace Graph Redesign & Forensic Board Report

## 1. Problem Statement & Architecture Review

In prior versions, RupeeTrace attempted to visualize all entities across 24 wards simultaneously on a single canvas. This caused:
1. **Severe Browser Lag**: Over 500 DOM and SVG elements rendered at once.
2. **Cognitive Overload**: A dense "hairball" graph where finding the connection between a road and an audit finding was nearly impossible.
3. **No Progressive Disclosure**: No way to drill down or expand specific paths of interest.
4. **False Accusation Risk**: Experimental ML semantic matches were visually indistinguishable from BMC SAP financial records.

---

## 2. Redesign Architecture & Implementation

### 2.1 Scoped Investigation Endpoint (`GET /api/graph/investigate`)
- **Location**: `rupeetrace/services/graph_service.py` & `rupeetrace/api/routes/graph.py`
- **Parameters**:
  - `mode`: `road` | `work_order` | `contractor` | `complaint` | `ward` | `audit`
  - `entity_id`: ID of the target root entity
  - `expanded_nodes`: List of node IDs whose connections should be progressively revealed
  - `include_ml`: Boolean toggle to include candidate ML relationships

### 2.2 Radial Layout Algorithm
- **Center Positioning**: The Root Node is placed at exact canvas center `(450, 320)`.
- **Radial Distribution**: Immediate 1-hop connections are arranged along a circular orbit at radius `R = 220px` with uniform angular spacing:
  $$\theta_i = -\frac{\pi}{2} + i \cdot \frac{2\pi}{N}$$
- **Expanded Nodes**: 2-hop connections project outward along vectors normal to their parent node, maintaining visual clarity.

### 2.3 Strict Separation of ML Relationships
- **Solid Dark Lines** (`#171717`, width `2.5px`): Deterministic relationships verified by official BMC records.
- **Dashed Crimson Lines** (`#FF3B30`, stroke-dasharray `6,4`): Candidate relationships derived from sentence-transformer semantic embeddings.
- **Explicit Confidence Badge**: Displayed directly on candidate edges (e.g. `ML Match: 84%`).
- **Audit Disclaimer**: Mandatory warning in the inspector noting that candidate links require officer verification before legal or financial action.

### 2.4 Contextual Right-Side Inspector Drawer
- Clicking any node displays an inspector drawer with:
  - Entity Category & ID
  - Core Metadata (Amounts in INR, Surface Type, Empanelled Years, Status)
  - Action buttons: "Expand Connections", "Inspect Full Road Passport", "View Evidence Dossier".

### 2.5 Tabular Forensic Alternative
- An interactive switch toggles between the SVG Radial Canvas and the **Forensic Table View**, enabling tabular sorting, category filtering, and export.
