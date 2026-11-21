import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from rupeetrace.core.config import settings

DB_PATH = settings.BASE_DIR / "rupeetrace" / "data" / "cases.db"

class CaseService:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or DB_PATH)
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cases (
                    case_id TEXT PRIMARY KEY,
                    road_id TEXT NOT NULL,
                    work_order_id TEXT,
                    citizen_observation TEXT NOT NULL,
                    evidence_references TEXT,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    officer_name TEXT,
                    officer_response TEXT,
                    follow_up_history TEXT
                )
            """)
            conn.commit()

            # Seed demo cases if table is empty
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM cases")
            count = cur.fetchone()[0]
            if count == 0:
                self._seed_demo_cases(conn)

    def _seed_demo_cases(self, conn: sqlite3.Connection):
        demo_cases = [
            (
                "CASE-2025-001",
                "RD0058",
                "WO25-00045",
                "Pothole repair at Hindmata junction washed away in heavy rain 2 weeks after work order marked completed.",
                json.dumps(["WO25-00045", "BMC25-000123", "RD0058"]),
                "2025-07-20 14:30:00",
                "Clarified",
                "Er. V. Deshmukh (Assistant Engineer, F/S)",
                "Site inspected on 21-Jul-2025. Severe waterlogging (45 cm) at Hindmata caused surface stripping. Defect liability clause invoked; contractor mobilized to re-lay with mastic asphalt at zero extra cost to BMC.",
                json.dumps([
                    {"date": "2025-07-20 14:30:00", "actor": "Citizen", "action": "Logged observation regarding premature surface failure"},
                    {"date": "2025-07-21 11:00:00", "actor": "Officer", "action": "Field verification conducted; contractor defect liability notice issued"},
                    {"date": "2025-07-22 16:00:00", "actor": "Officer", "action": "Status updated to Clarified with remedial work order scheduled"}
                ])
            ),
            (
                "CASE-2025-002",
                "RD0011",
                "WO25-02456",
                "Road RD0011 appears to have been billed twice within 4 days for cold mix patch by Deccan Paving Solutions.",
                json.dumps(["WO25-00606", "WO25-02456", "RD0011"]),
                "2025-08-10 09:15:00",
                "Under Review",
                "Er. S. Patil (Executive Engineer, Ward B)",
                "Cross-referencing site measurement books for WO25-00606 (chainage 0+150 to 0+200) and WO25-02456 (chainage 0+450 to 0+500) to verify physical separation of work locations.",
                json.dumps([
                    {"date": "2025-08-10 09:15:00", "actor": "Citizen", "action": "Flagged duplicate candidate work orders"},
                    {"date": "2025-08-11 10:30:00", "actor": "Officer", "action": "Measurement book audit initiated with Junior Engineer"}
                ])
            ),
            (
                "CASE-2025-003",
                "RD0071",
                None,
                "Kings Circle waterlogging chronic near Gandhi Market. Open manhole chamber poses safety risk to school bus route.",
                json.dumps(["RD0071", "FH002"]),
                "2025-08-25 18:45:00",
                "Action Taken",
                "Er. K. Mehta (Ward F/N)",
                "Ductile iron manhole cover and grating installed on 26-Aug-2025 morning crew shift. High-capacity dewatering pump deployed on standby for upcoming spring tide.",
                json.dumps([
                    {"date": "2025-08-25 18:45:00", "actor": "Citizen", "action": "Urgent hazard report near school bus corridor"},
                    {"date": "2025-08-26 08:30:00", "actor": "Officer", "action": "Emergency crew dispatched; manhole cover replaced"},
                    {"date": "2025-08-26 12:00:00", "actor": "Officer", "action": "Dewatering pump stationed at Gandhi Market"}
                ])
            )
        ]
        conn.executemany("""
            INSERT INTO cases (case_id, road_id, work_order_id, citizen_observation, evidence_references, created_at, status, officer_name, officer_response, follow_up_history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, demo_cases)
        conn.commit()

    def list_cases(self, road_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = "SELECT * FROM cases WHERE 1=1"
        params = []
        if road_id:
            query += " AND road_id = ?"
            params.append(road_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC"

        with self._get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
            return self._row_to_dict(row) if row else None

    def create_case(
        self,
        road_id: str,
        citizen_observation: str,
        work_order_id: Optional[str] = None,
        evidence_references: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        case_id = f"CASE-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        ev_json = json.dumps(evidence_references or ([work_order_id, road_id] if work_order_id else [road_id]))
        initial_history = json.dumps([
            {"date": now_str, "actor": "Citizen", "action": "Citizen observation submitted for verification"}
        ])

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO cases (case_id, road_id, work_order_id, citizen_observation, evidence_references, created_at, status, officer_name, officer_response, follow_up_history)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (case_id, road_id, work_order_id, citizen_observation, ev_json, now_str, "Under Review", None, None, initial_history))
            conn.commit()

        return self.get_case(case_id)

    def respond_case(
        self,
        case_id: str,
        officer_name: str,
        officer_response: str,
        new_status: str
    ) -> Optional[Dict[str, Any]]:
        existing = self.get_case(case_id)
        if not existing:
            return None

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        history = existing.get("follow_up_history", [])
        history.append({
            "date": now_str,
            "actor": "Officer",
            "action": f"Officer response recorded by {officer_name}. Status changed to {new_status}"
        })

        with self._get_connection() as conn:
            conn.execute("""
                UPDATE cases
                SET officer_name = ?, officer_response = ?, status = ?, follow_up_history = ?
                WHERE case_id = ?
            """, (officer_name, officer_response, new_status, json.dumps(history), case_id))
            conn.commit()

        return self.get_case(case_id)

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        try:
            d["evidence_references"] = json.loads(d["evidence_references"]) if d["evidence_references"] else []
        except Exception:
            d["evidence_references"] = []
        try:
            d["follow_up_history"] = json.loads(d["follow_up_history"]) if d["follow_up_history"] else []
        except Exception:
            d["follow_up_history"] = []
        return d
