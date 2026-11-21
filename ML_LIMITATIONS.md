# RupeeTrace ML Limitations, Boundaries & Failure Modes

## 1. Algorithmic Boundaries & Design Constraints

Machine learning within RupeeTrace is intentionally restrained:
1. **Never Autonomous**: Models generate screening recommendations and exploratory links. They never make binding legal, budgetary, or punitive determinations.
2. **Never Merge or Delete Records**: In duplicate candidate detection, source citizen complaint IDs, timestamps, and verbatim text are always preserved. Merging records could erase evidence of chronic community distress.
3. **No Presumption of Fraud**: Unusual financial variance flagged by Isolation Forest is classified strictly as an *unusual pattern* or *investigation candidate*. Higher unit costs frequently reflect emergency ground stabilization, deep water pumping, or unmapped utility diversions.

---

## 2. Model A Limitations (Issue Intelligence)

### 2.1 Vernacular Transliteration Variance
While Model A supports English, Marathi, Hindi, and Hinglish, heavily localized Romanized Hindi/Marathi slang (*"bhai full rasta khallas zhala"* vs *"rastya var khadda padla ahe"*) may experience slight cosine similarity degradation. Spatial and temporal bounding rules prevent complete misclassification.

### 2.2 Dense Urban GPS Jitter
In dense Mumbai corridors (e.g., Dharavi, Lower Parel high-rises), smartphone GPS error can exceed 50 meters. The spatial matching window is calibrated to 250 meters, which may occasionally associate two distinct defects on parallel alleys if timestamps coincide.

### 2.3 Noise Filter Nuance
The social media noise filter screens out greetings and generic weather complaints. However, nuanced complaints embedded within satire, political sarcasm, or internet memes may be categorized as non-actionable if no civic defect keywords are detected.

---

## 3. Model B Limitations (Repair Anomaly Engine)

### 3.1 Unmodeled Engineering Heterogeneity
Standard municipal rate cards assume standardized ground conditions. If a specific road segment requires:
- Deep subsurface excavation due to an unmapped water main rupture,
- High-grade rapid-hardening polymer additives for heavy arterial bus lanes, or
- Extended night-time police work window restrictions,
the unit cost will legitimately deviate from peer medians without indicating improper billing.

### 3.2 Small Peer Group Sensitivity
For specialized or low-frequency repair methods (e.g., `Excavation, pipeline repair, PQC patch` with $N=96$), statistical variances are wider than high-volume methods like `Cold mix patch` ($N=602$). Outlier thresholds are calibrated conservatively to minimize false positives.

### 3.3 Historical Data Cold-Start
For newly empanelled contractors or freshly paved roads with fewer than 5 historical work orders, anomaly screening relies primarily on repair-method peer group baselines rather than contractor-specific trends.

---

## 4. Fair Accountability & Synthetic Data Considerations

The current RupeeTrace implementation is validated against the synthetic dataset developed for the Claude Impact Labs research challenge. While distributions reflect realistic Mumbai municipal conditions, production municipal deployment requires:
- Continuous calibration against audited BMC SAP ERP work orders.
- Direct integration with BMC MCGM 24x7 citizen portal APIs.
- Regular bias audits to ensure equitable complaint clustering across suburban vs island city wards.
