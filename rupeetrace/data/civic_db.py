import os
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from rupeetrace.core.config import settings

CIVIC_DB_PATH = settings.BASE_DIR / "rupeetrace" / "data" / "civic.db"

class CivicDB:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or CIVIC_DB_PATH)
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def session(self):
        """Context manager that commits on success, rollbacks on error, and always closes the connection."""
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self.get_connection() as conn:
            # 1. Proposals table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS proposals (
                    proposal_id TEXT PRIMARY KEY,
                    ward_code TEXT NOT NULL,
                    locality TEXT NOT NULL,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    problem_statement TEXT NOT NULL,
                    generation_reason TEXT NOT NULL,
                    related_road_id TEXT NOT NULL,
                    related_road_name TEXT NOT NULL,
                    supporting_complaint_ids TEXT NOT NULL,
                    nearby_facilities TEXT NOT NULL,
                    flood_context TEXT NOT NULL,
                    traffic_context TEXT NOT NULL,
                    historical_work_orders_count INTEGER NOT NULL DEFAULT 0,
                    indicative_cost_inr REAL NOT NULL,
                    estimated_duration_days INTEGER NOT NULL DEFAULT 14,
                    expected_public_benefit TEXT NOT NULL,
                    risks_dependencies TEXT NOT NULL,
                    source_record_ids TEXT NOT NULL,
                    confidence_score REAL NOT NULL DEFAULT 85.0,
                    evidence_completeness_pct REAL NOT NULL DEFAULT 90.0,
                    under_dlp INTEGER NOT NULL DEFAULT 0,
                    dlp_investigation_flag INTEGER NOT NULL DEFAULT 0,
                    dlp_contractor_id TEXT,
                    dlp_notice TEXT,
                    score_factors TEXT NOT NULL,
                    composite_score REAL NOT NULL DEFAULT 50.0,
                    status TEXT NOT NULL DEFAULT 'Open for Voting',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_by TEXT NOT NULL DEFAULT 'Janmat AI Engine'
                )
            """)

            # 2. Citizen Votes table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS proposal_votes (
                    proposal_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    vote_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (proposal_id, user_id),
                    FOREIGN KEY (proposal_id) REFERENCES proposals (proposal_id) ON DELETE CASCADE
                )
            """)

            # 3. Citizen Comments table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS proposal_comments (
                    comment_id TEXT PRIMARY KEY,
                    proposal_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    user_role TEXT NOT NULL DEFAULT 'citizen',
                    comment_text TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (proposal_id) REFERENCES proposals (proposal_id) ON DELETE CASCADE
                )
            """)

            # 4. Proposal Lifecycle History table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS proposal_lifecycle (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    proposal_id TEXT NOT NULL,
                    previous_status TEXT NOT NULL,
                    new_status TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    supporting_evidence TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (proposal_id) REFERENCES proposals (proposal_id) ON DELETE CASCADE
                )
            """)

            # 5. Budget Scenarios table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS budget_scenarios (
                    scenario_id TEXT PRIMARY KEY,
                    ward_code TEXT NOT NULL,
                    scenario_name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    total_budget_inr REAL NOT NULL,
                    contingency_reserve_pct REAL NOT NULL DEFAULT 5.0,
                    selected_proposal_ids TEXT NOT NULL,
                    metrics_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL DEFAULT 'Demo Planner'
                )
            """)

            # 6. Tender Evaluations table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tender_evaluations (
                    tender_id TEXT PRIMARY KEY,
                    proposal_id TEXT NOT NULL,
                    project_scope TEXT NOT NULL,
                    qualification_criteria TEXT NOT NULL,
                    technical_criteria TEXT NOT NULL,
                    financial_criteria TEXT NOT NULL,
                    dlp_warranty_months INTEGER NOT NULL DEFAULT 24,
                    bids_json TEXT NOT NULL,
                    evaluation_summary TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (proposal_id) REFERENCES proposals (proposal_id) ON DELETE CASCADE
                )
            """)

            # 7. Verification Reports table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS verification_reports (
                    report_id TEXT PRIMARY KEY,
                    road_id TEXT NOT NULL,
                    work_order_id TEXT,
                    proposal_id TEXT,
                    stage TEXT NOT NULL,
                    evidence_type TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    submitter_id TEXT NOT NULL,
                    submitter_role TEXT NOT NULL DEFAULT 'citizen',
                    verification_action TEXT NOT NULL,
                    observation_text TEXT NOT NULL,
                    gps_lat REAL,
                    gps_lon REAL,
                    conflict_flag INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'Awaiting Citizen Review',
                    officer_notes TEXT,
                    created_at TEXT NOT NULL
                )
            """)

            # Indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_proposals_ward ON proposals (ward_code)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_proposals_road ON proposals (related_road_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_votes_proposal ON proposal_votes (proposal_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_comments_proposal ON proposal_comments (proposal_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_road ON verification_reports (road_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_verification_wo ON verification_reports (work_order_id)")

            conn.commit()
