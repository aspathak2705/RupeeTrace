# Model Card: Multilingual Issue Intelligence (Model A)

## 1. Model Details
- **Model Name**: RupeeTrace Multilingual Issue Intelligence (Model A)
- **Model Version**: 1.0.0
- **Model Date**: November 2026
- **Architecture**: Pretrained `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` with deterministic cross-lingual TF-IDF SVD fallback (384 dimensions).
- **Supported Languages**: English (`en`), Hindi (`hi`), Marathi (`mr`), Hinglish (`hi-en`).
- **License**: Apache 2.0 / Open Synthetic Civic Research.

---

## 2. Intended Use
- **Primary Use Case**: Semantic representation of multilingual municipal road complaints, candidate duplicate screening, cross-language incident clustering, and civic social media signal extraction.
- **Target Users**: BMC Ward Executive Engineers, road asset managers, investigative journalists, and civic transparency researchers.
- **Out of Scope**: Automated record deletion, automatic complaint merging, or autonomous work-order assignment without human verification.

---

## 3. Factors & Input Features
- **Complaint Description Text**: Unstructured civic problem descriptions in Roman and Devanagari scripts.
- **Category Reported**: Stated category from citizen intake channel.
- **Locality Text & Ward Code**: Administrative and neighborhood geographical labels.
- **GPS Coordinates & Accuracy**: Latitude, longitude, and stated accuracy in meters.
- **Received Timestamp**: Intake time for temporal proximity windowing ($\le 72$ hours).

---

## 4. Output Schema
- **384-dimensional Embeddings**: Normalized vector representation for vector search and cosine similarity.
- **Duplicate Candidate Pair**:
  - `match_score`: Composite confidence score $\in [0, 1]$.
  - `signal_breakdown`: Individual component scores for semantic text similarity, spatial distance in meters, and temporal delta in hours.
  - `provenance_status`: Always tagged as `"model-suggested"`.
- **Incident Cluster**:
  - `cluster_id`: Canonical identifier (e.g., `CLUST-K-W-001`).
  - `canonical_category`: Normalized defect classification.
  - `languages_present`: Set of languages discovered across member reports.
  - `confidence_score`: Average member similarity score.

---

## 5. Evaluation Data & Performance
- **Evaluation Dataset**: 6,501 synthetic Mumbai municipal complaints from `Claude-Impact-Labs-data-2`.
- **Cross-Lingual Incident Discovery**: Successfully discovered cross-lingual clusters combining English, Hindi, Hinglish, and Marathi reports regarding identical street locations.
- **Retrieval Latency**:
  - Pre-cached vector dot product: $< 0.1\text{ms}$ per pair.
  - Ward-partitioned candidate screening: $< 35\text{ms}$ for 200+ complaints.

---

## 6. Ethical Considerations & Limitations
- **No Autonomous Deduplication**: Candidate duplicates are flagged as review pairs; source records are never merged or suppressed, ensuring complete democratic audit trails.
- **Script Handling**: Devanagari script transliterations in informal Hinglish may produce lower semantic similarity if heavy slang is present; spatial and temporal signals compensate for vocabulary drift.
