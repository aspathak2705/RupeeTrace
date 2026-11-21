import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from rupeetrace.data.civic_db import CivicDB
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import RoadAsset, Ward, Complaint, Facility, FloodHotspot

class JanmatService:
    def __init__(self, rel_service: RelationshipService, civic_db: Optional[CivicDB] = None):
        self.rel_service = rel_service
        self.db = civic_db or CivicDB()
        self._ensure_proposals_seeded()

    def _get_conn(self):
        return self.db.session()

    def _ensure_proposals_seeded(self):
        """Generates initial evidence-grounded proposals across wards if empty."""
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM proposals")
            count = cur.fetchone()[0]
            if count > 0:
                return

        # Seed proposals across wards
        proposals_to_insert = self._generate_all_proposals()
        with self._get_conn() as conn:
            for p in proposals_to_insert:
                conn.execute("""
                    INSERT OR IGNORE INTO proposals (
                        proposal_id, ward_code, locality, category, title, problem_statement,
                        generation_reason, related_road_id, related_road_name, supporting_complaint_ids,
                        nearby_facilities, flood_context, traffic_context, historical_work_orders_count,
                        indicative_cost_inr, estimated_duration_days, expected_public_benefit,
                        risks_dependencies, source_record_ids, confidence_score, evidence_completeness_pct,
                        under_dlp, dlp_investigation_flag, dlp_contractor_id, dlp_notice,
                        score_factors, composite_score, status, created_at, updated_at, created_by
                    ) VALUES (
                        :proposal_id, :ward_code, :locality, :category, :title, :problem_statement,
                        :generation_reason, :related_road_id, :related_road_name, :supporting_complaint_ids,
                        :nearby_facilities, :flood_context, :traffic_context, :historical_work_orders_count,
                        :indicative_cost_inr, :estimated_duration_days, :expected_public_benefit,
                        :risks_dependencies, :source_record_ids, :confidence_score, :evidence_completeness_pct,
                        :under_dlp, :dlp_investigation_flag, :dlp_contractor_id, :dlp_notice,
                        :score_factors, :composite_score, :status, :created_at, :updated_at, :created_by
                    )
                """, p)

                # Add initial lifecycle event
                conn.execute("""
                    INSERT INTO proposal_lifecycle (
                        proposal_id, previous_status, new_status, actor, reason, supporting_evidence, timestamp
                    ) VALUES (
                        ?, 'Draft', ?, 'Janmat Automated Ingestion', 'Evidence criteria satisfied from open civic dataset signals.', ?, ?
                    )
                """, (p["proposal_id"], p["status"], json.dumps(json.loads(p["supporting_complaint_ids"])[:5]), p["created_at"]))

            # Seed realistic demo votes and comments for popular proposals
            self._seed_demo_community_activity(conn)
            conn.commit()

    def _generate_all_proposals(self) -> List[Dict[str, Any]]:
        """Scans actual dataset entities and constructs structured civic proposals."""
        proposals = []
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Prioritize key active wards
        target_wards = [w.ward_code for w in self.rel_service.loader.wards]

        for ward_code in target_wards:
            ward = self.rel_service.get_ward(ward_code)
            if not ward:
                continue

            ward_roads = [r for r in self.rel_service.loader.roads if r.ward_code == ward_code]
            if not ward_roads:
                continue

            # Group complaints by road
            for road in ward_roads:
                complaints = self.rel_service.complaints_by_road.get(road.road_id, [])
                open_complaints = [c for c in complaints if c.status in ("Open", "In Progress")]
                work_orders = self.rel_service.work_orders_by_road.get(road.road_id, [])
                facilities = self.rel_service.facilities_by_road.get(road.road_id, [])
                flood_spots = self.rel_service.flood_hotspots_by_road.get(road.road_id, [])
                accidents = self.rel_service.accidents_by_road.get(road.road_id, [])
                traffic = self.rel_service.traffic_by_road.get(road.road_id)

                # Determine if road has significant need
                hospitals = [f for f in facilities if f.type == "Hospital"]
                schools = [f for f in facilities if f.type == "School"]
                reopened_wos = [wo for wo in work_orders if wo.reopened_within_30d]
                pothole_complaints = [c for c in open_complaints if "pothole" in c.category_reported.lower()]
                drain_complaints = [c for c in open_complaints if any(k in c.category_reported.lower() for k in ["waterlog", "drain", "nullah"])]
                manhole_complaints = [c for c in open_complaints if "manhole" in c.category_reported.lower()]
                cavein_complaints = [c for c in open_complaints if "cave-in" in c.category_reported.lower()]

                # Case 1: School access road improvement
                if schools and (open_complaints or road.surface == "Paver blocks"):
                    sc_names = ", ".join(s.name for s in schools[:2])
                    p_id = f"PROP-{ward_code}-SCH-{road.road_id[-4:]}"
                    proposals.append(self._build_proposal_dict(
                        p_id=p_id,
                        ward=ward,
                        road=road,
                        category="School access road improvement",
                        title=f"Safe School Transit & Pavement Upgradation near {sc_names}",
                        problem=f"Pedestrian walkway erosion and recurring potholes on student commute route to {sc_names}.",
                        gen_reason=f"{len(schools)} educational facilities located within 250m; {len(open_complaints)} unresolved transit complaints registered.",
                        complaints=open_complaints[:8],
                        facilities=schools,
                        flood_spots=flood_spots,
                        accidents=accidents,
                        traffic=traffic,
                        work_orders=work_orders,
                        cost=350000.0,
                        duration=21,
                        benefit=f"Eliminates tripping hazards and water stagnation for over 2,500 students attending {sc_names}.",
                        risks="Monsoon school operating hours require non-disruptive night-shift work execution.",
                        now_str=now_str
                    ))

                # Case 2: Hospital and ambulance access improvement
                if hospitals and (open_complaints or len(accidents) > 0 or road.bus_route):
                    hosp_names = ", ".join(h.name for h in hospitals[:2])
                    p_id = f"PROP-{ward_code}-HSP-{road.road_id[-4:]}"
                    proposals.append(self._build_proposal_dict(
                        p_id=p_id,
                        ward=ward,
                        road=road,
                        category="Hospital and ambulance access improvement",
                        title=f"Emergency Corridor Surface Stabilization outside {hosp_names}",
                        problem=f"Surface vibration and uneven road profile impeding emergency vehicle transit to {hosp_names}.",
                        gen_reason=f"Direct critical access corridor to {hosp_names}; {len(accidents)} traffic accidents on record.",
                        complaints=open_complaints[:8],
                        facilities=hospitals,
                        flood_spots=flood_spots,
                        accidents=accidents,
                        traffic=traffic,
                        work_orders=work_orders,
                        cost=480000.0,
                        duration=15,
                        benefit=f"Guarantees rapid, shock-free emergency vehicle transit and zero water-logging outside healthcare gates.",
                        risks="Requires coordination with Mumbai Traffic Police for partial lane diversion.",
                        now_str=now_str
                    ))

                # Case 3: Stormwater drainage & flood-prone road improvement
                if flood_spots or drain_complaints or (ward.low_lying_index >= 0.65 and len(complaints) >= 3):
                    hs_name = flood_spots[0].name if flood_spots else "Chronic low-lying catchment"
                    p_id = f"PROP-{ward_code}-FLD-{road.road_id[-4:]}"
                    proposals.append(self._build_proposal_dict(
                        p_id=p_id,
                        ward=ward,
                        road=road,
                        category="Flood-prone road improvements",
                        title=f"Cross-Drainage Augmentation & Micro-Desilting at {road.road_name}",
                        problem=f"Monsoon inundation exceeding 30 cm depth during high tides along {road.road_name} near {hs_name}.",
                        gen_reason=f"Proximity to flood hotspot '{hs_name}'; ward low-lying vulnerability index is {ward.low_lying_index:.2f}.",
                        complaints=open_complaints[:10],
                        facilities=facilities,
                        flood_spots=flood_spots,
                        accidents=accidents,
                        traffic=traffic,
                        work_orders=work_orders,
                        cost=650000.0,
                        duration=30,
                        benefit="Accelerates flood drain-off time from 180 minutes to under 25 minutes during heavy rainfall.",
                        risks="Underground utility cables (BEST/MTNL/MGL) require manual excavation.",
                        now_str=now_str
                    ))

                # Case 4: Repeatedly reopened repair investigation (DLP Opportunity)
                if (reopened_wos or road.under_dlp) and len(work_orders) >= 2:
                    last_wo = work_orders[-1]
                    p_id = f"PROP-{ward_code}-DLP-{road.road_id[-4:]}"
                    proposals.append(self._build_proposal_dict(
                        p_id=p_id,
                        ward=ward,
                        road=road,
                        category="Repeatedly reopened repair investigation",
                        title=f"Forensic Defect Liability Audit & Core-Cut Inspection: {road.road_name}",
                        problem=f"Surface failed {len(reopened_wos)} times within 30 days of completion by contractor {last_wo.contractor_name}.",
                        gen_reason=f"Road under active DLP status (DLP: {road.under_dlp}); repeat failure indicates contractor workmanship or material sub-standardness.",
                        complaints=complaints[:6],
                        facilities=facilities,
                        flood_spots=flood_spots,
                        accidents=accidents,
                        traffic=traffic,
                        work_orders=work_orders,
                        cost=120000.0, # Lower indicative inspection cost
                        duration=10,
                        benefit="Enforces contractor rectification at ZERO public cost under BMC DLP contractual penalties.",
                        risks="Contractor dispute over subsurface utility excavation impact.",
                        now_str=now_str,
                        force_dlp=True,
                        dlp_contractor=last_wo.contractor_id
                    ))

                # Case 5: Road rehabilitation / Mastic asphalt
                if (cavein_complaints or manhole_complaints or pothole_complaints or len(open_complaints) >= 4) and len(proposals) < 35:
                    p_id = f"PROP-{ward_code}-REH-{road.road_id[-4:]}"
                    proposals.append(self._build_proposal_dict(
                        p_id=p_id,
                        ward=ward,
                        road=road,
                        category="Road rehabilitation",
                        title=f"Structural Mastic Asphalt Resurfacing on {road.road_name}",
                        problem=f"Extensive base course degradation, multiple pothole clusters, and uneven settlement.",
                        gen_reason=f"High traffic corridor with {len(open_complaints)} active complaints and heavy bus movement.",
                        complaints=open_complaints[:10],
                        facilities=facilities,
                        flood_spots=flood_spots,
                        accidents=accidents,
                        traffic=traffic,
                        work_orders=work_orders,
                        cost=420000.0,
                        duration=20,
                        benefit="Provides 5-year heavy-duty water-impermeable running surface conforming to IRC:SP:98.",
                        risks="Requires high ambient dry temperature during laying; unsuitable during active rain bursts.",
                        now_str=now_str
                    ))

        return proposals

    def _build_proposal_dict(
        self,
        p_id: str,
        ward: Ward,
        road: RoadAsset,
        category: str,
        title: str,
        problem: str,
        gen_reason: str,
        complaints: List[Complaint],
        facilities: List[Facility],
        flood_spots: List[FloodHotspot],
        accidents: List[Any],
        traffic: Optional[Any],
        work_orders: List[Any],
        cost: float,
        duration: int,
        benefit: str,
        risks: str,
        now_str: str,
        force_dlp: bool = False,
        dlp_contractor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates 8-factor scores and formats database row."""
        is_dlp = road.under_dlp or force_dlp
        dlp_flag = 1 if is_dlp else 0
        dlp_contractor_id = dlp_contractor or (work_orders[-1].contractor_id if work_orders else None)
        dlp_notice = (
            f"Road asset is under active Defect Liability Period (DLP). Section 14(B) BMC General Conditions of Contract applies. "
            f"Contractor {dlp_contractor_id or 'on record'} is legally bound to rectify defects at zero municipal cost."
            if is_dlp else None
        )

        # 8 Independent Dimensions (0 - 100):
        # 1. Public Priority
        total_upvotes = sum(c.upvotes for c in complaints)
        public_priority = min(100.0, round((len(complaints) * 12.0) + (total_upvotes * 4.0) + 20.0, 1))

        # 2. Infrastructure Urgency
        severity_map = {
            "Repeatedly reopened repair investigation": 95.0,
            "Flood-prone road improvements": 90.0,
            "Hospital and ambulance access improvement": 88.0,
            "Road rehabilitation": 80.0,
            "School access road improvement": 75.0,
            "Junction safety improvements": 70.0,
            "Pedestrian safety improvement": 65.0
        }
        urgency = severity_map.get(category, 60.0)

        # 3. Safety Impact
        safety_impact = min(100.0, round((len(accidents) * 25.0) + (30.0 if road.bus_route else 10.0), 1))

        # 4. Facility Accessibility Impact
        h_count = sum(1 for f in facilities if f.type == "Hospital")
        s_count = sum(1 for f in facilities if f.type == "School")
        facility_impact = min(100.0, round((h_count * 45.0) + (s_count * 25.0) + (len(facilities) * 5.0), 1))

        # 5. Financial Feasibility
        budget_ratio = (cost / max(100000.0, ward.monsoon_repair_budget_inr_2025)) * 100.0
        financial_feasibility = max(10.0, min(100.0, round(100.0 - (budget_ratio * 3.0), 1)))

        # 6. Technical Feasibility
        tech_feasibility = 95.0 if not force_dlp else 85.0

        # 7. Environmental & Flood Resilience
        flood_resilience = min(100.0, round((ward.low_lying_index * 60.0) + (40.0 if flood_spots else 10.0), 1))

        # 8. Evidence Confidence
        comp_with_gps = sum(1 for c in complaints if c.lat is not None and c.lon is not None)
        gps_ratio = (comp_with_gps / max(1, len(complaints))) if complaints else 0.5
        evidence_confidence = min(100.0, round((gps_ratio * 50.0) + (len(work_orders) * 10.0) + 30.0, 1))

        score_factors = {
            "public_priority": public_priority,
            "infrastructure_urgency": urgency,
            "safety_impact": safety_impact,
            "facility_accessibility_impact": facility_impact,
            "financial_feasibility": financial_feasibility,
            "technical_feasibility": tech_feasibility,
            "environmental_flood_resilience": flood_resilience,
            "evidence_confidence": evidence_confidence
        }

        # Composite score
        composite = round(
            (public_priority * 0.20) +
            (urgency * 0.20) +
            (safety_impact * 0.15) +
            (facility_impact * 0.15) +
            (financial_feasibility * 0.10) +
            (tech_feasibility * 0.05) +
            (flood_resilience * 0.10) +
            (evidence_confidence * 0.05),
            1
        )

        status = "Under Review" if force_dlp else "Open for Voting"

        return {
            "proposal_id": p_id,
            "ward_code": ward.ward_code,
            "locality": road.road_name.split()[0] if road.road_name else "Central Ward",
            "category": category,
            "title": title,
            "problem_statement": problem,
            "generation_reason": gen_reason,
            "related_road_id": road.road_id,
            "related_road_name": road.road_name,
            "supporting_complaint_ids": json.dumps([c.complaint_id for c in complaints]),
            "nearby_facilities": json.dumps([{"id": f.facility_id, "name": f.name, "type": f.type} for f in facilities[:4]]),
            "flood_context": json.dumps({
                "ward_low_lying_index": ward.low_lying_index,
                "hotspots_count": len(flood_spots),
                "nearest_hotspot": flood_spots[0].name if flood_spots else None
            }),
            "traffic_context": json.dumps({
                "congestion_index": traffic.congestion_index_0_10 if traffic else None,
                "bus_route": road.bus_route,
                "road_type": road.road_type
            }),
            "historical_work_orders_count": len(work_orders),
            "indicative_cost_inr": cost,
            "estimated_duration_days": duration,
            "expected_public_benefit": benefit,
            "risks_dependencies": risks,
            "source_record_ids": json.dumps([road.road_id] + [c.complaint_id for c in complaints[:3]] + [wo.work_order_id for wo in work_orders[:2]]),
            "confidence_score": evidence_confidence,
            "evidence_completeness_pct": min(100.0, round((len(complaints) * 10) + (len(facilities) * 15) + 35, 1)),
            "under_dlp": dlp_flag,
            "dlp_investigation_flag": dlp_flag,
            "dlp_contractor_id": dlp_contractor_id,
            "dlp_notice": dlp_notice,
            "score_factors": json.dumps(score_factors),
            "composite_score": composite,
            "status": status,
            "created_at": now_str,
            "updated_at": now_str,
            "created_by": "Janmat AI Intelligence Engine"
        }

    def _seed_demo_community_activity(self, conn: sqlite3.Connection):
        """Seeds realistic community votes, comments, and discussions for demonstration."""
        cur = conn.cursor()
        cur.execute("SELECT proposal_id, title FROM proposals LIMIT 10")
        sample_proposals = cur.fetchall()

        demo_users = [
            ("citizen_anand", "Anand Kulkarni (Resident)", "citizen"),
            ("citizen_priya", "Priya Mehta (Parent Council)", "citizen"),
            ("citizen_rahul", "Rahul Sharma (Commuter)", "citizen"),
            ("officer_deshmukh", "Er. V. Deshmukh (Assistant Engineer)", "officer"),
            ("citizen_sneha", "Dr. Sneha Roy (Resident Doctor)", "citizen"),
            ("engineer_patil", "Er. S. Patil (Executive Engineer)", "engineer")
        ]

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for row in sample_proposals:
            p_id = row["proposal_id"]
            # Cast upvotes from 3-5 demo citizens
            for user_id, user_name, role in demo_users[:4]:
                conn.execute("""
                    INSERT OR IGNORE INTO proposal_votes (proposal_id, user_id, vote_type, created_at, updated_at)
                    VALUES (?, ?, 'upvote', ?, ?)
                """, (p_id, user_id, now_str, now_str))

            # Add comments
            conn.execute("""
                INSERT OR IGNORE INTO proposal_comments (comment_id, proposal_id, user_id, user_name, user_role, comment_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"COMM-{uuid.uuid4().hex[:8]}",
                p_id,
                "citizen_priya",
                "Priya Mehta (Parent Council)",
                "citizen",
                "Crucial priority for morning school buses. Children have tripped on loose paver blocks during monsoon showers.",
                now_str
            ))

            conn.execute("""
                INSERT OR IGNORE INTO proposal_comments (comment_id, proposal_id, user_id, user_name, user_role, comment_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"COMM-{uuid.uuid4().hex[:8]}",
                p_id,
                "officer_deshmukh",
                "Er. V. Deshmukh (Assistant Engineer)",
                "officer",
                "Site survey completed. We recommend incorporating mastic asphalt wearing course with proper camber slope towards side drain.",
                now_str
            ))

    # --- Public API Methods ---

    def list_proposals(
        self,
        ward_code: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM proposals WHERE 1=1"
        params: List[Any] = []

        if ward_code and isinstance(ward_code, str):
            query += " AND ward_code = ?"
            params.append(ward_code)
        if category and isinstance(category, str):
            query += " AND category = ?"
            params.append(category)
        if status and isinstance(status, str):
            query += " AND status = ?"
            params.append(status)
        if search and isinstance(search, str):
            query += " AND (title LIKE ? OR problem_statement LIKE ? OR related_road_name LIKE ?)"
            s = f"%{search}%"
            params.extend([s, s, s])

        query += " ORDER BY composite_score DESC"

        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()

            results = []
            for r in rows:
                p_dict = dict(r)
                p_dict["supporting_complaint_ids"] = json.loads(p_dict["supporting_complaint_ids"])
                p_dict["nearby_facilities"] = json.loads(p_dict["nearby_facilities"])
                p_dict["flood_context"] = json.loads(p_dict["flood_context"])
                p_dict["traffic_context"] = json.loads(p_dict["traffic_context"])
                p_dict["source_record_ids"] = json.loads(p_dict["source_record_ids"])
                p_dict["score_factors"] = json.loads(p_dict["score_factors"])

                # Fetch vote counts
                cur.execute("SELECT COUNT(*), SUM(CASE WHEN vote_type='upvote' THEN 1 ELSE 0 END) FROM proposal_votes WHERE proposal_id=?", (p_dict["proposal_id"],))
                v_total, v_up = cur.fetchone()
                p_dict["votes_total"] = v_total or 0
                p_dict["votes_up"] = v_up or 0

                # Fetch comments count
                cur.execute("SELECT COUNT(*) FROM proposal_comments WHERE proposal_id=?", (p_dict["proposal_id"],))
                p_dict["comments_count"] = cur.fetchone()[0]

                results.append(p_dict)
            return results

    def get_proposal_detail(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM proposals WHERE proposal_id = ?", (proposal_id,))
            row = cur.fetchone()
            if not row:
                return None

            p_dict = dict(row)
            p_dict["supporting_complaint_ids"] = json.loads(p_dict["supporting_complaint_ids"])
            p_dict["nearby_facilities"] = json.loads(p_dict["nearby_facilities"])
            p_dict["flood_context"] = json.loads(p_dict["flood_context"])
            p_dict["traffic_context"] = json.loads(p_dict["traffic_context"])
            p_dict["source_record_ids"] = json.loads(p_dict["source_record_ids"])
            p_dict["score_factors"] = json.loads(p_dict["score_factors"])

            # Votes
            cur.execute("SELECT user_id, vote_type, updated_at FROM proposal_votes WHERE proposal_id = ?", (proposal_id,))
            votes = [dict(v) for v in cur.fetchall()]
            p_dict["votes"] = votes
            p_dict["votes_total"] = len(votes)
            p_dict["votes_up"] = sum(1 for v in votes if v["vote_type"] == "upvote")

            # Comments
            cur.execute("SELECT * FROM proposal_comments WHERE proposal_id = ? ORDER BY created_at ASC", (proposal_id,))
            p_dict["comments"] = [dict(c) for c in cur.fetchall()]

            # Lifecycle history
            cur.execute("SELECT * FROM proposal_lifecycle WHERE proposal_id = ? ORDER BY timestamp ASC", (proposal_id,))
            p_dict["lifecycle_history"] = [dict(l) for l in cur.fetchall()]

            return p_dict

    def cast_vote(self, proposal_id: str, user_id: str, vote_type: str = "upvote") -> Dict[str, Any]:
        """Enforces one active vote per authenticated user using transactions."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_conn() as conn:
            cur = conn.cursor()
            # Verify proposal exists
            cur.execute("SELECT proposal_id, status FROM proposals WHERE proposal_id = ?", (proposal_id,))
            p = cur.fetchone()
            if not p:
                raise ValueError("Proposal not found")

            # Upsert vote
            conn.execute("""
                INSERT INTO proposal_votes (proposal_id, user_id, vote_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(proposal_id, user_id) DO UPDATE SET
                    vote_type = excluded.vote_type,
                    updated_at = excluded.updated_at
            """, (proposal_id, user_id, vote_type, now_str, now_str))

            # Fetch updated tally
            cur.execute("SELECT COUNT(*), SUM(CASE WHEN vote_type='upvote' THEN 1 ELSE 0 END) FROM proposal_votes WHERE proposal_id=?", (proposal_id,))
            total, up = cur.fetchone()
            conn.commit()

            return {
                "proposal_id": proposal_id,
                "user_id": user_id,
                "vote_type": vote_type,
                "votes_total": total,
                "votes_up": up
            }

    def withdraw_vote(self, proposal_id: str, user_id: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            cur = conn.cursor()
            conn.execute("DELETE FROM proposal_votes WHERE proposal_id = ? AND user_id = ?", (proposal_id, user_id))
            cur.execute("SELECT COUNT(*), SUM(CASE WHEN vote_type='upvote' THEN 1 ELSE 0 END) FROM proposal_votes WHERE proposal_id=?", (proposal_id,))
            total, up = cur.fetchone()
            conn.commit()
            return {
                "proposal_id": proposal_id,
                "user_id": user_id,
                "withdrawn": True,
                "votes_total": total or 0,
                "votes_up": up or 0
            }

    def add_comment(
        self,
        proposal_id: str,
        user_id: str,
        user_name: str,
        comment_text: str,
        user_role: str = "citizen"
    ) -> Dict[str, Any]:
        comment_id = f"COMM-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT proposal_id FROM proposals WHERE proposal_id = ?", (proposal_id,))
            if not cur.fetchone():
                raise ValueError("Proposal not found")

            conn.execute("""
                INSERT INTO proposal_comments (comment_id, proposal_id, user_id, user_name, user_role, comment_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (comment_id, proposal_id, user_id, user_name, user_role, comment_text, now_str))
            conn.commit()

            return {
                "comment_id": comment_id,
                "proposal_id": proposal_id,
                "user_id": user_id,
                "user_name": user_name,
                "user_role": user_role,
                "comment_text": comment_text,
                "created_at": now_str
            }

    def update_lifecycle_status(
        self,
        proposal_id: str,
        new_status: str,
        actor: str,
        reason: str,
        supporting_evidence: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows authorized demo officers/engineers to advance lifecycle."""
        valid_statuses = [
            "Draft", "Evidence Review", "Technical Review", "Open for Voting",
            "Voting Closed", "Budget Review", "Approved", "Deferred", "Rejected",
            "Tender Preparation", "In Progress", "Completed", "Citizen Verification"
        ]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of: {valid_statuses}")

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT status FROM proposals WHERE proposal_id = ?", (proposal_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError("Proposal not found")
            old_status = row["status"]

            # Update status in proposals
            conn.execute("""
                UPDATE proposals
                SET status = ?, updated_at = ?
                WHERE proposal_id = ?
            """, (new_status, now_str, proposal_id))

            # Record event in lifecycle table
            conn.execute("""
                INSERT INTO proposal_lifecycle (proposal_id, previous_status, new_status, actor, reason, supporting_evidence, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (proposal_id, old_status, new_status, actor, reason, supporting_evidence or "Administrative action", now_str))

            conn.commit()

            return {
                "proposal_id": proposal_id,
                "previous_status": old_status,
                "new_status": new_status,
                "actor": actor,
                "reason": reason,
                "updated_at": now_str
            }

    def create_citizen_proposal(
        self,
        ward_code: str,
        road_id: str,
        category: str,
        title: str,
        problem_statement: str,
        citizen_id: str,
        citizen_name: str
    ) -> Dict[str, Any]:
        """Allows citizens to suggest a missing infrastructure need."""
        road = self.rel_service.get_road(road_id)
        if not road:
            raise ValueError(f"Road {road_id} not found")
        ward = self.rel_service.get_ward(ward_code)
        if not ward:
            raise ValueError(f"Ward {ward_code} not found")

        p_id = f"PROP-{ward_code}-CIT-{uuid.uuid4().hex[:6].upper()}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        complaints = self.rel_service.complaints_by_road.get(road.road_id, [])
        facilities = self.rel_service.facilities_by_road.get(road.road_id, [])
        flood_spots = self.rel_service.flood_hotspots_by_road.get(road.road_id, [])
        traffic = self.rel_service.traffic_by_road.get(road.road_id)
        work_orders = self.rel_service.work_orders_by_road.get(road.road_id, [])

        p_dict = self._build_proposal_dict(
            p_id=p_id,
            ward=ward,
            road=road,
            category=category,
            title=title,
            problem=problem_statement,
            gen_reason=f"Suggested by citizen {citizen_name} via JANMAT Citizen Voice.",
            complaints=complaints[:5],
            facilities=facilities,
            flood_spots=flood_spots,
            accidents=[],
            traffic=traffic,
            work_orders=work_orders,
            cost=250000.0,
            duration=14,
            benefit="Direct community-driven amenity restoration.",
            risks="Requires engineering site measurement by Junior Engineer.",
            now_str=now_str
        )
        p_dict["created_by"] = f"{citizen_name} ({citizen_id})"
        p_dict["status"] = "Open for Voting"

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO proposals (
                    proposal_id, ward_code, locality, category, title, problem_statement,
                    generation_reason, related_road_id, related_road_name, supporting_complaint_ids,
                    nearby_facilities, flood_context, traffic_context, historical_work_orders_count,
                    indicative_cost_inr, estimated_duration_days, expected_public_benefit,
                    risks_dependencies, source_record_ids, confidence_score, evidence_completeness_pct,
                    under_dlp, dlp_investigation_flag, dlp_contractor_id, dlp_notice,
                    score_factors, composite_score, status, created_at, updated_at, created_by
                ) VALUES (
                    :proposal_id, :ward_code, :locality, :category, :title, :problem_statement,
                    :generation_reason, :related_road_id, :related_road_name, :supporting_complaint_ids,
                    :nearby_facilities, :flood_context, :traffic_context, :historical_work_orders_count,
                    :indicative_cost_inr, :estimated_duration_days, :expected_public_benefit,
                    :risks_dependencies, :source_record_ids, :confidence_score, :evidence_completeness_pct,
                    :under_dlp, :dlp_investigation_flag, :dlp_contractor_id, :dlp_notice,
                    :score_factors, :composite_score, :status, :created_at, :updated_at, :created_by
                )
            """, p_dict)

            # Auto upvote by submitter
            conn.execute("""
                INSERT INTO proposal_votes (proposal_id, user_id, vote_type, created_at, updated_at)
                VALUES (?, ?, 'upvote', ?, ?)
            """, (p_id, citizen_id, now_str, now_str))

            # Initial lifecycle event
            conn.execute("""
                INSERT INTO proposal_lifecycle (proposal_id, previous_status, new_status, actor, reason, supporting_evidence, timestamp)
                VALUES (?, 'Draft', 'Open for Voting', ?, 'Community proposal submitted via JANMAT', 'Citizen verified', ?)
            """, (p_id, citizen_name, now_str))

            conn.commit()

        return self.get_proposal_detail(p_id)
