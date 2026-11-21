import os
import math
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np

from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import Complaint
from rupeetrace.core.provenance import SourceProvenance

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

# Canonical civic issue categories
CANONICAL_CATEGORIES = [
    "Pothole",
    "Waterlogging",
    "Open or broken manhole",
    "Broken paver blocks",
    "Choked drain / nullah overflow",
    "Road cave-in",
    "Street furniture / railing",
    "Other"
]

# Multilingual keywords for classification and social post filtering
ISSUE_LEXICON = {
    "Pothole": [
        "pothole", "potholes", "crater", "khadda", "khadde", "gaddha", "gadde",
        "खड्डा", "खड्डे", "गड्डा", "गड्ढे", "road broken", "rough surface", "crater"
    ],
    "Waterlogging": [
        "waterlogging", "waterlogged", "water logging", "water logging", "paani", "pani",
        "flood", "flooding", "submerged", "पाणी", "पाणी साचले", "जलभराव", "जलजमाव",
        "water accumulated", "lake on road", "water knee deep"
    ],
    "Open or broken manhole": [
        "manhole", "drain cover", "gutter cover", "open drain", "chamber", "dhakkan",
        "गटर", "मॅनहोल", "उघडे मॅनहोल", "ढक्कन", "खुला मैनहोल", "sewer cover", "broken grate"
    ],
    "Broken paver blocks": [
        "paver", "paver blocks", "footpath", "pavement", "tiles", "interlocking",
        "पेव्हर ब्लॉक", "फूटपाथ", "पेवर ब्लॉक", "uneven footpath", "loose tiles"
    ],
    "Choked drain / nullah overflow": [
        "nullah", "nala", "nallah", "choked drain", "overflow", "gutter", "drainage",
        "नाल्याचे पाणी", "नाला", "ड्रेनेज", "नाली जाम", "choked gutter", "sewage overflow"
    ],
    "Road cave-in": [
        "cave in", "cave-in", "caved in", "sinkhole", "road collapsed", "subsidence",
        "रस्ता खचला", "रस्ता धसला", "सड़क धंस गई", "सड़क बैठ गई"
    ]
}

# Non-actionable noise keywords for social post filtering
SOCIAL_NOISE_KEYWORDS = [
    "good morning", "shubh prabhat", "suprabhat", "school band", "chutti",
    "birthday", "festival", "ganpati bappa", "diwali", "cricket", "match",
    "movie", "chai", "coffee", "weather forecast", "happy sunday", "quote",
    "suvichar", "sale", "discount", "zomato", "swiggy"
]

# Urgency indicators in social posts
HIGH_URGENCY_KEYWORDS = [
    "accident", "injured", "hospital", "death", "ambulance stuck", "trapped",
    "car submerged", "bus stuck", "two wheeler fell", "danger", "hazardous",
    "life threatening", "severe injury", "जीवघेणा", "अपघात", "गंभीर", "धोकादायक"
]

class MLIssueService:
    """
    Model A — Multilingual Issue Intelligence Service.
    Provides semantic complaint understanding, duplicate candidate screening,
    incident clustering across languages, normalized category inference,
    social signal filtering, and candidate work-order linking.
    """

    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self.embedding_dim = 384
        self._embeddings: Optional[np.ndarray] = None
        self._complaint_id_to_idx: Dict[str, int] = {}
        self._complaint_ids: List[str] = []
        
        # Cache paths
        self.cache_dir = Path(os.environ.get("CACHE_DIR", Path(__file__).resolve().parent.parent / "data" / "cache"))
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.embeddings_cache_file = self.cache_dir / "complaint_embeddings.npz"

        # Map complaints to roads from RelationshipService
        self._complaint_to_road: Dict[str, str] = {}
        for rid, clist in self.rel_service.complaints_by_road.items():
            for c in clist:
                self._complaint_to_road[c.complaint_id] = rid

        # Precompute timestamp in hours for ultra-fast temporal indexing
        self._parsed_hours: Dict[str, float] = {}
        for c in self.rel_service.loader.complaints:
            try:
                dt = datetime.strptime(c.received_at, "%Y-%m-%d %H:%M:%S") if ":" in c.received_at else datetime.strptime(c.received_at, "%Y-%m-%d")
                self._parsed_hours[c.complaint_id] = dt.timestamp() / 3600.0
            except Exception:
                self._parsed_hours[c.complaint_id] = 0.0

        # Cached clusters & duplicates
        self._cached_clusters: Optional[List[Dict[str, Any]]] = None
        self._cached_duplicates: Optional[List[Dict[str, Any]]] = None
        self._cached_social_signals: Optional[List[Dict[str, Any]]] = None

        # Build embeddings index
        self._initialize_embeddings()

    def _initialize_embeddings(self):
        """Initializes 384-dimensional multilingual embeddings for complaints."""
        complaints = self.rel_service.loader.complaints
        if not complaints:
            return

        self._complaint_ids = [c.complaint_id for c in complaints]
        self._complaint_id_to_idx = {cid: idx for idx, cid in enumerate(self._complaint_ids)}

        # 1. Try loading cached embeddings
        if self.embeddings_cache_file.exists():
            try:
                data = np.load(self.embeddings_cache_file, allow_pickle=True)
                cached_ids = list(data["ids"])
                cached_emb = data["embeddings"]
                if cached_ids == self._complaint_ids and cached_emb.shape == (len(complaints), self.embedding_dim):
                    self._embeddings = cached_emb
                    return
            except Exception:
                pass

        # 2. Compute embeddings
        self._compute_and_cache_embeddings(complaints)

    def _compute_and_cache_embeddings(self, complaints: List[Complaint]):
        """
        Encodes complaints into normalized 384-dimensional dense vectors.
        Uses sentence-transformers if weights available locally,
        else uses multilingual character/word n-gram SVD projection matching 384 dims.
        """
        texts = [f"{c.category_reported} {c.description} {c.locality_text}" for c in complaints]
        embeddings = None

        # Try sentence-transformers with local_files_only=True to prevent network retry hangs
        try:
            import sentence_transformers
            model = sentence_transformers.SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                local_files_only=True
            )
            raw_emb = model.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
            if raw_emb.shape[1] == self.embedding_dim:
                embeddings = raw_emb.astype(np.float32)
        except Exception:
            embeddings = None

        # Robust offline multilingual semantic embedder fallback
        if embeddings is None:
            embeddings = self._build_offline_multilingual_embeddings(texts)

        self._embeddings = embeddings

        # Save to disk cache
        try:
            np.savez_compressed(
                self.embeddings_cache_file,
                ids=np.array(self._complaint_ids, dtype=object),
                embeddings=self._embeddings
            )
        except Exception:
            pass

    def _build_offline_multilingual_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generates 384-dimensional dense semantic vectors using character n-grams,
        cross-lingual road domain lexicon weights, and Truncated SVD.
        Produces deterministic, normalized 384-dim representations for offline execution.
        """
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.decomposition import TruncatedSVD

        # Multilingual character + word n-grams capture Devanagari roots and Hinglish phonetic variants
        vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            min_df=2,
            max_features=12000,
            sublinear_tf=True
        )
        sparse_mat = vectorizer.fit_transform(texts)

        # Domain lexicon boosting for road keywords
        feature_names = vectorizer.get_feature_names_out()
        boost_mask = np.ones(sparse_mat.shape[1], dtype=np.float32)
        for cat, keywords in ISSUE_LEXICON.items():
            for kw in keywords:
                kw_lower = kw.lower()
                for idx, feat in enumerate(feature_names):
                    if feat in kw_lower or kw_lower in feat:
                        boost_mask[idx] = 2.5
        
        # Apply weighting
        sparse_mat = sparse_mat.multiply(boost_mask)

        # Dimensionality reduction to exact 384 dimensions
        n_components = min(self.embedding_dim, sparse_mat.shape[1] - 1, sparse_mat.shape[0] - 1)
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        dense_vecs = svd.fit_transform(sparse_mat)

        # Zero pad if n_components < 384
        if dense_vecs.shape[1] < self.embedding_dim:
            pad = np.zeros((dense_vecs.shape[0], self.embedding_dim - dense_vecs.shape[1]), dtype=np.float32)
            dense_vecs = np.hstack([dense_vecs, pad])

        # Normalize to unit length (L2 norm)
        norms = np.linalg.norm(dense_vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        dense_vecs = dense_vecs / norms

        return dense_vecs.astype(np.float32)

    def get_embedding(self, complaint_id: str) -> Optional[np.ndarray]:
        idx = self._complaint_id_to_idx.get(complaint_id)
        if idx is not None and self._embeddings is not None:
            return self._embeddings[idx]
        return None

    def compute_similarity(self, complaint_id_1: str, complaint_id_2: str) -> float:
        emb1 = self.get_embedding(complaint_id_1)
        emb2 = self.get_embedding(complaint_id_2)
        if emb1 is not None and emb2 is not None:
            sim = float(np.dot(emb1, emb2))
            return max(0.0, min(1.0, sim))
        return 0.0

    # ---------------------------------------------------------
    # DUPLICATE CANDIDATE DETECTION
    # ---------------------------------------------------------
    def find_duplicate_candidates(
        self,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        spatial_threshold_m: float = 250.0,
        temporal_threshold_hours: float = 72.0,
        min_composite_score: float = 0.65,
        limit: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Discovers candidate duplicate complaints based on composite multi-signal scoring:
        - Semantic text similarity (Paraphrase Multilingual 384-dim cosine)
        - Spatial distance (Haversine formula <= 250m)
        - Temporal window (<= 72 hours)
        - Category alignment
        - Locality match
        Preserves original records with full provenance. Never merges source records.
        """
        # Determine candidate groups (partitioning by ward prevents O(N^2) cross-city comparisons)
        groups: List[List[Complaint]] = []
        if road_id:
            groups = [self.rel_service.get_road_complaints(road_id)]
        elif ward_code:
            groups = [self.rel_service.get_ward_complaints(ward_code)]
        else:
            groups = [self.rel_service.get_ward_complaints(w.ward_code) for w in self.rel_service.loader.wards]

        candidates = []
        for group in groups:
            if len(group) < 2:
                continue

            # Sort temporally using precomputed hours
            sorted_c = sorted(group, key=lambda x: self._parsed_hours.get(x.complaint_id, 0.0))

            for i in range(len(sorted_c)):
                c1 = sorted_c[i]
                h1 = self._parsed_hours.get(c1.complaint_id, 0.0)

                for j in range(i + 1, len(sorted_c)):
                    c2 = sorted_c[j]
                    h2 = self._parsed_hours.get(c2.complaint_id, 0.0)

                    time_delta_hours = h2 - h1
                    if time_delta_hours > temporal_threshold_hours:
                        # Because sorted ascending in time, all subsequent pairs will also exceed window
                        break

                    # Spatial distance
                    has_coords = (c1.lat is not None and c1.lon is not None and c2.lat is not None and c2.lon is not None)
                    if has_coords:
                        dist_m = haversine_m(c1.lat, c1.lon, c2.lat, c2.lon)
                        if dist_m > spatial_threshold_m:
                            continue
                        s_geo = max(0.0, 1.0 - (dist_m / spatial_threshold_m))
                    else:
                        r1 = self._complaint_to_road.get(c1.complaint_id)
                        r2 = self._complaint_to_road.get(c2.complaint_id)
                        same_loc = (c1.locality_text and c2.locality_text and c1.locality_text.lower() == c2.locality_text.lower())
                        same_road = (r1 and r2 and r1 == r2)
                        if not (same_loc or same_road):
                            continue
                        dist_m = 100.0
                        s_geo = 0.6

                    # Semantic text similarity
                    sem_sim = self.compute_similarity(c1.complaint_id, c2.complaint_id)

                    # Signals
                    s_time = max(0.0, 1.0 - (time_delta_hours / temporal_threshold_hours))
                    s_cat = 1.0 if c1.category_reported == c2.category_reported else 0.4
                    s_loc = 1.0 if (c1.locality_text and c2.locality_text and c1.locality_text.lower() == c2.locality_text.lower()) else 0.5

                    composite_score = (
                        0.40 * sem_sim +
                        0.30 * s_geo +
                        0.15 * s_time +
                        0.10 * s_cat +
                        0.05 * s_loc
                    )

                    if composite_score >= min_composite_score:
                        candidates.append({
                            "candidate_id": f"DUP-{c1.complaint_id}-{c2.complaint_id}",
                            "complaint_1": {
                                "complaint_id": c1.complaint_id,
                                "received_at": c1.received_at,
                                "language": c1.language,
                                "category": c1.category_reported,
                                "description": c1.description,
                                "locality": c1.locality_text,
                                "lat": c1.lat,
                                "lon": c1.lon
                            },
                            "complaint_2": {
                                "complaint_id": c2.complaint_id,
                                "received_at": c2.received_at,
                                "language": c2.language,
                                "category": c2.category_reported,
                                "description": c2.description,
                                "locality": c2.locality_text,
                                "lat": c2.lat,
                                "lon": c2.lon
                            },
                            "match_score": round(composite_score, 3),
                            "signal_breakdown": {
                                "semantic_similarity": round(sem_sim, 3),
                                "spatial_proximity_score": round(s_geo, 3),
                                "distance_meters": round(dist_m, 1),
                                "temporal_proximity_score": round(s_time, 3),
                                "delta_hours": round(time_delta_hours, 1),
                                "category_match": s_cat == 1.0
                            },
                            "cross_lingual": c1.language != c2.language,
                            "ward_code": c1.ward_code,
                            "road_id": self._complaint_to_road.get(c1.complaint_id) or self._complaint_to_road.get(c2.complaint_id),
                            "provenance_status": "model-suggested"
                        })

                if len(candidates) >= limit:
                    break
            if len(candidates) >= limit:
                break

        # Sort by match score descending
        candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return candidates[:limit]

    # ---------------------------------------------------------
    # INCIDENT CLUSTERING
    # ---------------------------------------------------------
    def get_incident_clusters(
        self,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        min_cluster_size: int = 2,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Groups complaints into cross-language incident clusters using spatial, temporal,
        and semantic proximity graph clustering.
        """
        duplicate_pairs = self.find_duplicate_candidates(
            ward_code=ward_code,
            road_id=road_id,
            spatial_threshold_m=300.0,
            temporal_threshold_hours=96.0,
            min_composite_score=0.60,
            limit=500
        )

        # Adjacency graph
        adj: Dict[str, Set[str]] = {}
        pair_scores: Dict[Tuple[str, str], float] = {}
        for p in duplicate_pairs:
            c1_id = p["complaint_1"]["complaint_id"]
            c2_id = p["complaint_2"]["complaint_id"]
            adj.setdefault(c1_id, set()).add(c2_id)
            adj.setdefault(c2_id, set()).add(c1_id)
            pair_scores[(c1_id, c2_id)] = p["match_score"]
            pair_scores[(c2_id, c1_id)] = p["match_score"]

        # Connected components
        visited: Set[str] = set()
        raw_clusters: List[List[str]] = []

        for cid in adj:
            if cid not in visited:
                comp = []
                queue = [cid]
                visited.add(cid)
                while queue:
                    curr = queue.pop(0)
                    comp.append(curr)
                    for nbr in adj.get(curr, []):
                        if nbr not in visited:
                            visited.add(nbr)
                            queue.append(nbr)
                if len(comp) >= min_cluster_size:
                    raw_clusters.append(comp)

        clusters = []
        for idx, comp in enumerate(raw_clusters):
            items = [self.rel_service.get_complaint(cid) for cid in comp if self.rel_service.get_complaint(cid)]
            if not items:
                continue

            # Select representative complaint (highest upvotes, or most central)
            items_sorted = sorted(items, key=lambda x: (x.upvotes, len(x.description)), reverse=True)
            rep = items_sorted[0]

            languages = list({it.language for it in items if it.language})
            categories = list({it.category_reported for it in items if it.category_reported})
            wards = list({it.ward_code for it in items if it.ward_code})
            roads = list({self._complaint_to_road[it.complaint_id] for it in items if it.complaint_id in self._complaint_to_road})
            localities = list({it.locality_text for it in items if it.locality_text})

            # Canonical category
            norm_cat = self.normalize_category(rep.category_reported, rep.description)

            # Dates
            dates = [it.received_at for it in items]
            min_date = min(dates)
            max_date = max(dates)

            # Average cluster confidence
            scores = []
            for i in range(len(comp)):
                for j in range(i + 1, len(comp)):
                    s = pair_scores.get((comp[i], comp[j]))
                    if s is not None:
                        scores.append(s)
            avg_conf = round(float(np.mean(scores)), 2) if scores else 0.75

            lats = [it.lat for it in items if it.lat is not None]
            lons = [it.lon for it in items if it.lon is not None]
            c_lat = round(float(np.mean(lats)), 5) if lats else 19.0760
            c_lon = round(float(np.mean(lons)), 5) if lons else 72.8777

            clusters.append({
                "cluster_id": f"CLUST-{wards[0] if wards else 'GEN'}-{idx+1:03d}",
                "canonical_category": norm_cat,
                "representative_description": rep.description,
                "representative_complaint_id": rep.complaint_id,
                "complaint_ids": comp,
                "total_complaints": len(comp),
                "total_upvotes": sum(it.upvotes for it in items),
                "languages_present": languages,
                "cross_lingual": len(languages) > 1,
                "categories_reported": categories,
                "ward_code": wards[0] if wards else None,
                "road_id": roads[0] if roads else None,
                "locality": localities[0] if localities else "Ward Area",
                "center_lat": c_lat,
                "center_lon": c_lon,
                "first_reported_at": min_date,
                "last_reported_at": max_date,
                "confidence_score": avg_conf,
                "provenance_status": "model-suggested"
            })

        # Sort by total complaints and upvotes
        clusters.sort(key=lambda x: (x["total_complaints"], x["total_upvotes"]), reverse=True)
        return clusters[:limit]

    def get_cluster_by_id(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        clusters = self.get_incident_clusters(limit=200)
        for cl in clusters:
            if cl["cluster_id"] == cluster_id:
                # Include full complaint objects
                cl_copy = dict(cl)
                cl_copy["member_complaints"] = [
                    self.rel_service.get_complaint(cid).dict()
                    for cid in cl["complaint_ids"]
                    if self.rel_service.get_complaint(cid)
                ]
                return cl_copy
        return None

    # ---------------------------------------------------------
    # NORMALIZED CATEGORY INFERENCE
    # ---------------------------------------------------------
    def normalize_category(self, reported_category: str, description: str) -> str:
        """
        Maps raw category or vague label ("Other", "Road related") to a canonical category.
        Preserves original records; provides model-suggested canonical taxonomy.
        """
        if reported_category in CANONICAL_CATEGORIES and reported_category not in ["Other", "Road related"]:
            return reported_category

        text = f"{reported_category} {description}".lower()

        # Score matching keywords
        best_cat = "Other"
        max_matches = 0

        for cat, keywords in ISSUE_LEXICON.items():
            matches = sum(1 for kw in keywords if kw.lower() in text)
            if matches > max_matches:
                max_matches = matches
                best_cat = cat

        if max_matches > 0:
            return best_cat

        return reported_category if reported_category else "Other"

    # ---------------------------------------------------------
    # SOCIAL POST FILTERING & SIGNAL EXTRACTION
    # ---------------------------------------------------------
    def get_social_signals(
        self,
        ward_code: Optional[str] = None,
        only_actionable: bool = True,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Filters social posts into actionable civic signals vs irrelevant chatter.
        Extracts mentioned roads, localities, categories, and urgency level.
        """
        posts = self.rel_service.loader.social_posts
        if not posts:
            return []

        # Localities lookup for spatial grounding
        localities_dict = {
            loc["locality"].lower(): loc for loc in self.rel_service.loader.localities
        }

        signals = []
        for post in posts:
            text = post["text"].lower()

            # 1. Noise check
            is_noise = any(noise in text for noise in SOCIAL_NOISE_KEYWORDS)

            # 2. Issue keyword detection
            detected_issue = None
            max_matches = 0
            for cat, keywords in ISSUE_LEXICON.items():
                m = sum(1 for kw in keywords if kw.lower() in text)
                if m > max_matches:
                    max_matches = m
                    detected_issue = cat

            is_actionable = (max_matches > 0) and not is_noise

            if only_actionable and not is_actionable:
                continue

            # 3. Locality / Ward extraction
            extracted_loc = None
            matched_ward = None
            for loc_name, loc_meta in localities_dict.items():
                if loc_name in text:
                    extracted_loc = loc_meta["locality"]
                    matched_ward = loc_meta["ward_code"]
                    break

            # If ward filter is active
            if ward_code and matched_ward and matched_ward != ward_code:
                continue

            # 4. Urgency assessment
            is_high_urgency = any(ukw in text for ukw in HIGH_URGENCY_KEYWORDS)
            urgency = "HIGH" if is_high_urgency else ("MEDIUM" if is_actionable else "LOW")

            signals.append({
                "post_id": post["post_id"],
                "posted_at": post["posted_at"],
                "source": post["source"],
                "author_handle": post["author_handle"],
                "text": post["text"],
                "has_media": post["has_media"],
                "likes_or_forwards": post["likes_or_forwards"],
                "is_actionable": is_actionable,
                "detected_issue": detected_issue,
                "extracted_locality": extracted_loc,
                "matched_ward_code": matched_ward,
                "urgency": urgency,
                "provenance": post["provenance"].dict()
            })

            if len(signals) >= limit:
                break

        return signals[:limit]

    # ---------------------------------------------------------
    # CANDIDATE COMPLAINT-TO-WORK-ORDER LINK SUGGESTIONS
    # ---------------------------------------------------------
    def suggest_work_order_links(
        self,
        road_id: str,
        temporal_window_days: int = 45
    ) -> List[Dict[str, Any]]:
        """
        Suggests candidate matches between unlinked complaints and work orders on the same road.
        Preserves provenance levels: 'source-linked', 'model-suggested', 'human-reviewed'.
        """
        complaints = self.rel_service.get_road_complaints(road_id)
        work_orders = self.rel_service.get_road_work_orders(road_id)

        suggestions = []
        for c in complaints:
            # Check if already source-linked
            existing_wos = self.rel_service.complaint_to_wos_map.get(c.complaint_id, [])
            if existing_wos:
                continue

            c_date = datetime.strptime(c.received_at, "%Y-%m-%d %H:%M:%S") if ":" in c.received_at else datetime.strptime(c.received_at, "%Y-%m-%d")

            for wo in work_orders:
                wo_date = datetime.strptime(wo.assigned_at, "%Y-%m-%d %H:%M:%S") if ":" in wo.assigned_at else datetime.strptime(wo.assigned_at, "%Y-%m-%d")
                delta_days = (wo_date - c_date).total_seconds() / 86400.0

                # If repair was assigned between -5 and +temporal_window_days after complaint
                if -5 <= delta_days <= temporal_window_days:
                    suggestions.append({
                        "complaint_id": c.complaint_id,
                        "work_order_id": wo.work_order_id,
                        "road_id": road_id,
                        "complaint_date": c.received_at,
                        "work_order_date": wo.assigned_at,
                        "delta_days": round(delta_days, 1),
                        "complaint_category": c.category_reported,
                        "repair_method": wo.repair_method,
                        "provenance_status": "model-suggested",
                        "confidence_score": 0.82 if delta_days >= 0 else 0.55
                    })

        return suggestions
