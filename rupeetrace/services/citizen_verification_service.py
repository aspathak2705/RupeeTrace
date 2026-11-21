import os
import json
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from rupeetrace.core.config import settings
from rupeetrace.data.civic_db import CivicDB
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import WorkOrder, RoadAsset

UPLOAD_DIR = settings.BASE_DIR / "rupeetrace" / "data" / "uploads"

class CitizenVerificationService:
    def __init__(
        self,
        rel_service: RelationshipService,
        civic_db: Optional[CivicDB] = None
    ):
        self.rel_service = rel_service
        self.db = civic_db or CivicDB()
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        self._seed_demo_verification_records()

    def _get_conn(self):
        return self.db.session()

    def _seed_demo_verification_records(self):
        """Seeds realistic before/after evidence and discrepancy cases for demonstration."""
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM verification_reports")
            if cur.fetchone()[0] > 0:
                return

            demo_reports = [
                # Case 1: RD0140 (Chakala Sahar Link Road) - Conflicting Evidence!
                {
                    "report_id": "VR-2025-001",
                    "road_id": "RD0140",
                    "work_order_id": "WO25-00600",
                    "proposal_id": "PROP-K/E-REH-0140",
                    "stage": "Contractor-submitted completion",
                    "evidence_type": "Photo",
                    "image_url": "/demo-assets/contractor_completion_wo0600.jpg",
                    "submitter_id": "CT01",
                    "submitter_role": "contractor",
                    "verification_action": "Confirmed Completed",
                    "observation_text": "Mastic asphalt resurfacing completed across 120 sqm between chainage 0+200 and 0+320. Surface rolled with 8-ton vibratory roller.",
                    "gps_lat": 19.1136,
                    "gps_lon": 72.8697,
                    "conflict_flag": 0,
                    "status": "Awaiting Citizen Review",
                    "officer_notes": "Junior Engineer initial measurement recorded in MB #442 page 88.",
                    "created_at": "2025-08-14 16:30:00"
                },
                {
                    "report_id": "VR-2025-002",
                    "road_id": "RD0140",
                    "work_order_id": "WO25-00600",
                    "proposal_id": "PROP-K/E-REH-0140",
                    "stage": "Citizen verification",
                    "evidence_type": "Citizen Observation",
                    "image_url": "/demo-assets/citizen_reopened_wo0600.jpg",
                    "submitter_id": "citizen_rahul",
                    "submitter_role": "citizen",
                    "verification_action": "Visible Damage/Reopened",
                    "observation_text": "Pothole reappeared within 6 days of contractor marking completion. Deep pothole right in front of metro pillar #118.",
                    "gps_lat": 19.1138,
                    "gps_lon": 72.8699,
                    "conflict_flag": 1,
                    "status": "Conflicting Evidence",
                    "officer_notes": "Discrepancy detected: citizen photo directly contradicts contractor completion sign-off. Flagged for Joint Measurement Inspection.",
                    "created_at": "2025-08-20 09:15:00"
                },
                # Case 2: RD0058 (Hindmata Flyover Underpass, Ward F/S) - Verified Completion
                {
                    "report_id": "VR-2025-003",
                    "road_id": "RD0058",
                    "work_order_id": "WO25-00045",
                    "proposal_id": "PROP-F/S-FLD-0058",
                    "stage": "Before-work",
                    "evidence_type": "Photo",
                    "image_url": "/demo-assets/before_hindmata_drain.jpg",
                    "submitter_id": "citizen_priya",
                    "submitter_role": "citizen",
                    "verification_action": "Unable to Verify",
                    "observation_text": "Severe waterlogging up to 45cm and silt accumulation in stormwater conduit after initial monsoon shower.",
                    "gps_lat": 19.0065,
                    "gps_lon": 72.8423,
                    "conflict_flag": 0,
                    "status": "Verified by Evidence",
                    "officer_notes": "Silt depth verified at 35cm prior to pump deployment.",
                    "created_at": "2025-07-02 11:00:00"
                },
                {
                    "report_id": "VR-2025-004",
                    "road_id": "RD0058",
                    "work_order_id": "WO25-00045",
                    "proposal_id": "PROP-F/S-FLD-0058",
                    "stage": "Citizen verification",
                    "evidence_type": "Citizen Observation",
                    "image_url": "/demo-assets/citizen_verified_hindmata.jpg",
                    "submitter_id": "citizen_priya",
                    "submitter_role": "citizen",
                    "verification_action": "Confirmed Completed",
                    "observation_text": "Pump deployed and operational; water drained within 20 minutes during subsequent high tide rain on 22-July.",
                    "gps_lat": 19.0068,
                    "gps_lon": 72.8421,
                    "conflict_flag": 0,
                    "status": "Verified by Available Evidence",
                    "officer_notes": "Community confirmation matches telemetric flood sensor records.",
                    "created_at": "2025-07-23 14:20:00"
                }
            ]

            for r in demo_reports:
                conn.execute("""
                    INSERT INTO verification_reports (
                        report_id, road_id, work_order_id, proposal_id, stage, evidence_type,
                        image_url, submitter_id, submitter_role, verification_action,
                        observation_text, gps_lat, gps_lon, conflict_flag, status,
                        officer_notes, created_at
                    ) VALUES (
                        :report_id, :road_id, :work_order_id, :proposal_id, :stage, :evidence_type,
                        :image_url, :submitter_id, :submitter_role, :verification_action,
                        :observation_text, :gps_lat, :gps_lon, :conflict_flag, :status,
                        :officer_notes, :created_at
                    )
                """, r)
            conn.commit()

    def get_road_verification_summary(self, road_id: str) -> Dict[str, Any]:
        """Returns the 7-stage verification timeline, before/after evidence, and discrepancy flags."""
        road = self.rel_service.get_road(road_id)
        if not road:
            raise ValueError(f"Road {road_id} not found")

        w_orders = self.rel_service.work_orders_by_road.get(road_id, [])
        complaints = self.rel_service.complaints_by_road.get(road_id, [])

        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT * FROM verification_reports
                WHERE road_id = ?
                ORDER BY created_at ASC
            """, (road_id,))
            reports = [dict(r) for r in cur.fetchall()]

        # Identify conflicts
        conflict_reports = [r for r in reports if r["conflict_flag"] == 1]
        has_active_conflict = len(conflict_reports) > 0

        # Stages
        stages = [
            {"stage_no": 1, "name": "Before-Work Evidence", "status": "Available" if complaints else "Pending", "count": len(complaints)},
            {"stage_no": 2, "name": "Work-in-Progress", "status": "Logged" if any(r["stage"] == "Work-in-progress" for r in reports) else "Pending"},
            {"stage_no": 3, "name": "Contractor Completion", "status": "Submitted" if any(r["stage"] == "Contractor-submitted completion" for r in reports) else "Pending"},
            {"stage_no": 4, "name": "Officer Technical Review", "status": "Logged" if any(r.get("officer_notes") for r in reports) else "Pending"},
            {"stage_no": 5, "name": "Citizen Verification", "status": "Action Required" if has_active_conflict else ("Feedback Received" if reports else "Open")},
            {"stage_no": 6, "name": "Post-Completion Monitoring", "status": "Monitoring (30-day DLP)" if road.under_dlp else "Completed"},
            {"stage_no": 7, "name": "Final Verification Summary", "status": "Flagged for Inspection" if has_active_conflict else "Verified"}
        ]

        # Before & After pair
        before_evidence = None
        after_evidence = None

        comp_with_photo = next((c for c in complaints if c.photo_url or c.photo_description), None)
        if comp_with_photo:
            before_evidence = {
                "source": "Citizen Complaint",
                "id": comp_with_photo.complaint_id,
                "description": comp_with_photo.description,
                "category": comp_with_photo.category_reported,
                "photo_url": comp_with_photo.photo_url or "/demo-assets/default_pothole_before.jpg",
                "date": comp_with_photo.received_at
            }
        else:
            before_evidence = {
                "source": "Road Asset Inventory",
                "id": road.road_id,
                "description": f"Baseline road condition: {road.surface} ({road.road_type}), Length {road.length_m}m",
                "category": "Baseline Asset",
                "photo_url": "/demo-assets/default_road_baseline.jpg",
                "date": "2025-05-01"
            }

        contractor_report = next((r for r in reports if r["stage"] == "Contractor-submitted completion"), None)
        citizen_report = next((r for r in reports if r["stage"] == "Citizen verification"), None)

        if citizen_report:
            after_evidence = {
                "source": f"Citizen Observation ({citizen_report['submitter_id']})",
                "id": citizen_report["report_id"],
                "description": citizen_report["observation_text"],
                "verification_action": citizen_report["verification_action"],
                "photo_url": citizen_report["image_url"],
                "date": citizen_report["created_at"],
                "is_conflict": bool(citizen_report["conflict_flag"])
            }
        elif contractor_report:
            after_evidence = {
                "source": f"Contractor Work Order ({contractor_report['work_order_id'] or 'Contractor'})",
                "id": contractor_report["report_id"],
                "description": contractor_report["observation_text"],
                "verification_action": contractor_report["verification_action"],
                "photo_url": contractor_report["image_url"],
                "date": contractor_report["created_at"],
                "is_conflict": False
            }

        return {
            "road_id": road.road_id,
            "road_name": road.road_name,
            "ward_code": road.ward_code,
            "under_dlp": road.under_dlp,
            "overall_verification_status": "Flagged for Joint Site Inspection" if has_active_conflict else ("Verified by Available Evidence" if reports else "Awaiting Citizen Review"),
            "has_discrepancy_conflict": has_active_conflict,
            "active_conflicts": conflict_reports,
            "verification_stages": stages,
            "before_after_comparison": {
                "before": before_evidence,
                "after": after_evidence
            },
            "all_evidence_reports": reports
        }

    def submit_citizen_verification(
        self,
        road_id: str,
        work_order_id: Optional[str],
        verification_action: str,
        observation_text: str,
        submitter_id: str,
        image_url: Optional[str] = None,
        gps_lat: Optional[float] = None,
        gps_lon: Optional[float] = None,
        proposal_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Records an independent citizen verification report and runs automated discrepancy detection.
        """
        valid_actions = [
            "Confirmed Completed",
            "Incomplete",
            "Poor Workmanship",
            "Visible Damage/Reopened",
            "Wrong Location",
            "Unable to Verify"
        ]
        if verification_action not in valid_actions:
            raise ValueError(f"Invalid verification action. Must be one of: {valid_actions}")

        report_id = f"VR-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Discrepancy Detection Logic:
        # If action is 'Incomplete', 'Visible Damage/Reopened', or 'Wrong Location', flag conflict
        conflict_flag = 1 if verification_action in ("Incomplete", "Visible Damage/Reopened", "Wrong Location") else 0

        status = "Conflicting Evidence" if conflict_flag else "Verified by Available Evidence"
        officer_note = (
            f"Automated Discrepancy Trigger: Citizen reported '{verification_action}'. Triggered technical inspection request."
            if conflict_flag else "Community verification matches recorded scope of work."
        )

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO verification_reports (
                    report_id, road_id, work_order_id, proposal_id, stage, evidence_type,
                    image_url, submitter_id, submitter_role, verification_action,
                    observation_text, gps_lat, gps_lon, conflict_flag, status,
                    officer_notes, created_at
                ) VALUES (?, ?, ?, ?, 'Citizen verification', 'Citizen Observation', ?, ?, 'citizen', ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report_id, road_id, work_order_id, proposal_id,
                image_url or "/demo-assets/citizen_observation_default.jpg",
                submitter_id, verification_action, observation_text,
                gps_lat, gps_lon, conflict_flag, status, officer_note, now_str
            ))
            conn.commit()

        return {
            "report_id": report_id,
            "road_id": road_id,
            "work_order_id": work_order_id,
            "verification_action": verification_action,
            "status": status,
            "conflict_flag": bool(conflict_flag),
            "discrepancy_alert": conflict_flag == 1,
            "officer_action_triggered": "Site Inspection Escalation" if conflict_flag else "Recorded in Ledger",
            "created_at": now_str
        }

    def save_uploaded_evidence(self, filename: str, content_bytes: bytes) -> str:
        """
        Safely validates file upload (size < 5MB, safe extension, sanitized filename).
        """
        max_size = 5 * 1024 * 1024 # 5 MB
        if len(content_bytes) > max_size:
            raise ValueError("File size exceeds 5MB limit.")

        ext = Path(filename).suffix.lower()
        allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
        if ext not in allowed_exts:
            raise ValueError(f"Invalid file extension '{ext}'. Allowed: {allowed_exts}")

        clean_name = re.sub(r'[^a-zA-Z0-9_\-.]', '', Path(filename).stem)[:30]
        safe_filename = f"{clean_name}_{uuid.uuid4().hex[:8]}{ext}"
        target_path = UPLOAD_DIR / safe_filename

        with open(target_path, "wb") as f:
            f.write(content_bytes)

        return f"/api/uploads/{safe_filename}"
