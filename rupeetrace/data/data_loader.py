import os
import json
import math
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from rupeetrace.core.config import settings
from rupeetrace.core.provenance import SourceProvenance
from rupeetrace.models.entities import (
    Ward, RoadAsset, Complaint, Contractor, RateCard, WorkOrder,
    TrafficRecord, Accident, Facility, FloodHotspot, RainfallDaily,
    TideRecord, EnvironmentalObservation
)

def _parse_bool(val: Any) -> bool:
    if pd.isna(val) or val is None:
        return False
    s = str(val).strip().upper()
    return s in ("Y", "YES", "TRUE", "1")

def _parse_str(val: Any, default: Optional[str] = None) -> Optional[str]:
    if pd.isna(val) or val is None:
        return default
    s = str(val).strip()
    return s if s else default

def _parse_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    if pd.isna(val) or val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def _parse_int(val: Any, default: int = 0) -> int:
    if pd.isna(val) or val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def _parse_datetime_str(val: Any) -> Optional[str]:
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    try:
        dt = pd.to_datetime(s)
        return dt.strftime("%Y-%m-%d %H:%M:%S") if ":" in s else dt.strftime("%Y-%m-%d")
    except Exception:
        return s

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class DataLoader:
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = Path(data_dir or settings.DATA_DIR)
        
        # Raw DataFrames & GeoJSON structures
        self.raw_dfs: Dict[str, pd.DataFrame] = {}
        self.raw_geojsons: Dict[str, Any] = {}
        
        # Normalized Entity Collections
        self.wards: List[Ward] = []
        self.roads: List[RoadAsset] = []
        self.complaints: List[Complaint] = []
        self.complaints_sample_200: List[Complaint] = []
        self.contractors: List[Contractor] = []
        self.rate_cards: List[RateCard] = []
        self.work_orders: List[WorkOrder] = []
        self.traffic: List[TrafficRecord] = []
        self.accidents: List[Accident] = []
        self.facilities: List[Facility] = []
        self.flood_hotspots: List[FloodHotspot] = []
        self.rainfall: List[RainfallDaily] = []
        self.tides: List[TideRecord] = []
        self.environmental_observations: List[EnvironmentalObservation] = []
        self.social_posts: List[Dict[str, Any]] = []
        self.localities: List[Dict[str, Any]] = []

        # Ingestion metrics and anomalies
        self.ingestion_stats: Dict[str, Any] = {}

    def load_all(self) -> Dict[str, Any]:
        """Loads and normalizes all synthetic civic datasets."""
        self._load_raw_files()
        self._normalize_rate_cards()
        self._normalize_wards()
        self._normalize_roads()
        self._normalize_contractors()
        self._normalize_traffic()
        self._normalize_work_orders()
        self._normalize_complaints()
        self._normalize_accidents()
        self._normalize_facilities()
        self._normalize_flood_hotspots()
        self._normalize_rainfall()
        self._normalize_tides()
        self._normalize_social_posts()
        self._normalize_localities()

        self.ingestion_stats = {
            "wards_count": len(self.wards),
            "roads_count": len(self.roads),
            "contractors_count": len(self.contractors),
            "rate_cards_count": len(self.rate_cards),
            "work_orders_count": len(self.work_orders),
            "complaints_count": len(self.complaints),
            "complaints_sample_count": len(self.complaints_sample_200),
            "traffic_count": len(self.traffic),
            "accidents_count": len(self.accidents),
            "facilities_count": len(self.facilities),
            "flood_hotspots_count": len(self.flood_hotspots),
            "rainfall_records_count": len(self.rainfall),
            "tide_records_count": len(self.tides),
            "social_posts_count": len(self.social_posts),
            "localities_count": len(self.localities),
            "data_directory": str(self.data_dir)
        }
        return self.ingestion_stats

    def _load_raw_files(self):
        csv_files = [
            "wards.csv", "roads.csv", "contractors.csv", "rate_card.csv",
            "work_orders.csv", "complaints.csv", "complaints_sample_200.csv",
            "traffic.csv", "accidents.csv", "facilities.csv", "flood_hotspots.csv",
            "rainfall_daily.csv", "tides.csv", "social_posts.csv", "localities.csv"
        ]
        for fname in csv_files:
            fpath = self.data_dir / fname
            if not fpath.exists():
                raise FileNotFoundError(f"Required dataset file not found: {fpath}")
            self.raw_dfs[fname] = pd.read_csv(fpath, low_memory=False)

        geojson_files = ["roads.geojson", "wards.geojson"]
        for gname in geojson_files:
            gpath = self.data_dir / gname
            if not gpath.exists():
                raise FileNotFoundError(f"Required GeoJSON file not found: {gpath}")
            with open(gpath, "r", encoding="utf-8") as f:
                self.raw_geojsons[gname] = json.load(f)

    def _normalize_rate_cards(self):
        df = self.raw_dfs["rate_card.csv"]
        self.rate_cards = []
        for idx, row in df.iterrows():
            rc = RateCard(
                repair_method=str(row["repair_method"]).strip(),
                unit=str(row["unit"]).strip(),
                standard_rate_inr=float(row["standard_rate_inr"]),
                provenance=SourceProvenance(
                    source_file="rate_card.csv",
                    source_record_id=str(row["repair_method"]).strip(),
                    row_index=idx
                )
            )
            self.rate_cards.append(rc)

    def _normalize_wards(self):
        df = self.raw_dfs["wards.csv"]
        self.wards = []
        for idx, row in df.iterrows():
            localities_list = [
                loc.strip() for loc in str(row.get("localities", "")).split(";") if loc.strip()
            ]
            ward = Ward(
                ward_code=str(row["ward_code"]).strip(),
                ward_name=str(row["ward_name"]).strip(),
                zone=str(row["zone"]).strip(),
                assistant_commissioner_office=str(row["assistant_commissioner_office"]).strip(),
                centroid_lat=float(row["centroid_lat"]),
                centroid_lon=float(row["centroid_lon"]),
                approx_area_km2=float(row["approx_area_km2"]),
                population_est=int(row["population_est"]),
                low_lying_index=float(row["low_lying_index"]),
                engineering_crews=int(row["engineering_crews"]),
                localities=localities_list,
                monsoon_repair_budget_inr_2025=float(row["monsoon_repair_budget_inr_2025"]),
                provenance=SourceProvenance(
                    source_file="wards.csv",
                    source_record_id=str(row["ward_code"]).strip(),
                    row_index=idx
                )
            )
            self.wards.append(ward)

    def _normalize_roads(self):
        df = self.raw_dfs["roads.csv"]
        self.roads = []
        for idx, row in df.iterrows():
            road = RoadAsset(
                road_id=str(row["road_id"]).strip(),
                road_name=str(row["road_name"]).strip(),
                segment_no=int(row["segment_no"]),
                ward_code=str(row["ward_code"]).strip(),
                road_type=str(row["road_type"]).strip(),
                surface=str(row["surface"]).strip(),
                lanes=int(row["lanes"]),
                length_m=float(row["length_m"]),
                start_lat=float(row["start_lat"]),
                start_lon=float(row["start_lon"]),
                end_lat=float(row["end_lat"]),
                end_lon=float(row["end_lon"]),
                last_resurfaced=_parse_datetime_str(row.get("last_resurfaced")),
                under_dlp=_parse_bool(row.get("under_dlp")),
                bus_route=_parse_bool(row.get("bus_route")),
                provenance=SourceProvenance(
                    source_file="roads.csv",
                    source_record_id=str(row["road_id"]).strip(),
                    row_index=idx
                )
            )
            self.roads.append(road)

    def _normalize_contractors(self):
        df = self.raw_dfs["contractors.csv"]
        self.contractors = []
        for idx, row in df.iterrows():
            wards_list = [
                w.strip() for w in str(row.get("active_wards", "")).split(";") if w.strip()
            ]
            c = Contractor(
                contractor_id=str(row["contractor_id"]).strip(),
                contractor_name=str(row["contractor_name"]).strip(),
                empanelled_since=int(row["empanelled_since"]),
                active_wards=wards_list,
                provenance=SourceProvenance(
                    source_file="contractors.csv",
                    source_record_id=str(row["contractor_id"]).strip(),
                    row_index=idx
                )
            )
            self.contractors.append(c)

    def _normalize_traffic(self):
        df = self.raw_dfs["traffic.csv"]
        self.traffic = []
        for idx, row in df.iterrows():
            tr = TrafficRecord(
                road_id=str(row["road_id"]).strip(),
                peak_hour_vehicles=int(row["peak_hour_vehicles"]),
                avg_peak_speed_kmph=float(row["avg_peak_speed_kmph"]),
                congestion_index_0_10=float(row["congestion_index_0_10"]),
                bus_routes_count=int(row["bus_routes_count"]),
                two_wheeler_share_pct=float(row["two_wheeler_share_pct"]),
                provenance=SourceProvenance(
                    source_file="traffic.csv",
                    source_record_id=str(row["road_id"]).strip(),
                    row_index=idx
                )
            )
            self.traffic.append(tr)

    def _normalize_work_orders(self):
        df = self.raw_dfs["work_orders.csv"]
        rate_card_map = {rc.repair_method: rc for rc in self.rate_cards}
        roads_dlp_map = {r.road_id: r.under_dlp for r in self.roads}

        self.work_orders = []
        for idx, row in df.iterrows():
            raw_linked = _parse_str(row.get("linked_complaint_ids"))
            linked_ids = [
                cid.strip() for cid in raw_linked.split("|") if cid.strip()
            ] if raw_linked else []

            repair_method = str(row["repair_method"]).strip()
            cost_inr = float(row["cost_inr"])
            area_sqm = float(row["area_sqm"])
            road_id = str(row["road_id"]).strip()

            # Calculate expected cost & audit variance against rate card
            expected_cost: Optional[float] = None
            variance_inr: Optional[float] = None
            variance_pct: Optional[float] = None
            is_overbilled = False

            rc = rate_card_map.get(repair_method)
            if rc:
                if rc.unit == "per sqm":
                    expected_cost = round(area_sqm * rc.standard_rate_inr, 2)
                else:
                    expected_cost = round(rc.standard_rate_inr, 2)
                variance_inr = round(cost_inr - expected_cost, 2)
                if expected_cost > 0:
                    variance_pct = round((variance_inr / expected_cost) * 100.0, 2)
                    # Flag if cost exceeds 30% over standard rate
                    if variance_pct > 30.0:
                        is_overbilled = True

            # Check Defect Liability Period breach
            is_dlp_breach = roads_dlp_map.get(road_id, False)

            wo = WorkOrder(
                work_order_id=str(row["work_order_id"]).strip(),
                linked_complaint_ids=linked_ids,
                ward_code=str(row["ward_code"]).strip(),
                road_id=road_id,
                work_type=str(row["work_type"]).strip(),
                repair_method=repair_method,
                contractor_id=str(row["contractor_id"]).strip(),
                contractor_name=str(row["contractor_name"]).strip(),
                assigned_at=_parse_datetime_str(row["assigned_at"]),
                work_started_at=_parse_datetime_str(row["work_started_at"]),
                completed_at=_parse_datetime_str(row["completed_at"]),
                area_sqm=area_sqm,
                cost_inr=cost_inr,
                sla_hours=float(row["sla_hours"]),
                sla_met=_parse_bool(row["sla_met"]),
                reopened_within_30d=_parse_bool(row["reopened_within_30d"]),
                engineer_remark=_parse_str(row.get("engineer_remark")),
                expected_cost_inr=expected_cost,
                cost_variance_inr=variance_inr,
                cost_variance_pct=variance_pct,
                is_overbilled=is_overbilled,
                is_dlp_breach=is_dlp_breach,
                provenance=SourceProvenance(
                    source_file="work_orders.csv",
                    source_record_id=str(row["work_order_id"]).strip(),
                    row_index=idx
                )
            )
            self.work_orders.append(wo)

    def _normalize_complaints(self):
        df_full = self.raw_dfs["complaints.csv"]
        self.complaints = []
        for idx, row in df_full.iterrows():
            c = Complaint(
                complaint_id=str(row["complaint_id"]).strip(),
                received_at=_parse_datetime_str(row["received_at"]),
                channel=str(row["channel"]).strip(),
                category_reported=str(row["category_reported"]).strip(),
                description=str(row["description"]),
                language=str(row["language"]).strip(),
                locality_text=str(row["locality_text"]).strip(),
                ward_code=_parse_str(row.get("ward_code")),
                lat=_parse_float(row.get("lat")),
                lon=_parse_float(row.get("lon")),
                gps_accuracy_m=_parse_float(row.get("gps_accuracy_m")),
                photo_url=_parse_str(row.get("photo_url")),
                photo_description=_parse_str(row.get("photo_description")),
                complainant_id=str(row["complainant_id"]).strip(),
                upvotes=_parse_int(row.get("upvotes"), 0),
                status=str(row["status"]).strip(),
                resolved_at=_parse_datetime_str(row.get("resolved_at")),
                provenance=SourceProvenance(
                    source_file="complaints.csv",
                    source_record_id=str(row["complaint_id"]).strip(),
                    row_index=idx
                )
            )
            self.complaints.append(c)

        df_sample = self.raw_dfs["complaints_sample_200.csv"]
        self.complaints_sample_200 = []
        for idx, row in df_sample.iterrows():
            c = Complaint(
                complaint_id=str(row["complaint_id"]).strip(),
                received_at=_parse_datetime_str(row["received_at"]),
                channel=str(row["channel"]).strip(),
                category_reported=str(row["category_reported"]).strip(),
                description=str(row["description"]),
                language=str(row["language"]).strip(),
                locality_text=str(row["locality_text"]).strip(),
                ward_code=_parse_str(row.get("ward_code")),
                lat=_parse_float(row.get("lat")),
                lon=_parse_float(row.get("lon")),
                gps_accuracy_m=_parse_float(row.get("gps_accuracy_m")),
                photo_url=_parse_str(row.get("photo_url")),
                photo_description=_parse_str(row.get("photo_description")),
                complainant_id=str(row["complainant_id"]).strip(),
                upvotes=_parse_int(row.get("upvotes"), 0),
                status=str(row["status"]).strip(),
                resolved_at=_parse_datetime_str(row.get("resolved_at")),
                provenance=SourceProvenance(
                    source_file="complaints_sample_200.csv",
                    source_record_id=str(row["complaint_id"]).strip(),
                    row_index=idx
                )
            )
            self.complaints_sample_200.append(c)

    def _normalize_accidents(self):
        df = self.raw_dfs["accidents.csv"]
        self.accidents = []
        for idx, row in df.iterrows():
            acc = Accident(
                accident_id=str(row["accident_id"]).strip(),
                occurred_at=_parse_datetime_str(row["occurred_at"]),
                ward_code=str(row["ward_code"]).strip(),
                road_id=str(row["road_id"]).strip(),
                lat=float(row["lat"]),
                lon=float(row["lon"]),
                vehicle_type=str(row["vehicle_type"]).strip(),
                severity=str(row["severity"]).strip(),
                probable_cause=str(row["probable_cause"]).strip(),
                provenance=SourceProvenance(
                    source_file="accidents.csv",
                    source_record_id=str(row["accident_id"]).strip(),
                    row_index=idx
                )
            )
            self.accidents.append(acc)

    def _normalize_facilities(self):
        df = self.raw_dfs["facilities.csv"]
        self.facilities = []
        for idx, row in df.iterrows():
            fac = Facility(
                facility_id=str(row["facility_id"]).strip(),
                type=str(row["type"]).strip(),
                name=str(row["name"]).strip(),
                ward_code=str(row["ward_code"]).strip(),
                lat=float(row["lat"]),
                lon=float(row["lon"]),
                beds_or_students=int(row["beds_or_students"]),
                emergency_services=_parse_bool(row.get("emergency_services")),
                ambulance_entry_road=str(row["ambulance_entry_road"]).strip(),
                provenance=SourceProvenance(
                    source_file="facilities.csv",
                    source_record_id=str(row["facility_id"]).strip(),
                    row_index=idx
                )
            )
            self.facilities.append(fac)

    def _normalize_flood_hotspots(self):
        df = self.raw_dfs["flood_hotspots.csv"]
        self.flood_hotspots = []
        roads_by_ward: Dict[str, List[RoadAsset]] = {}
        for r in self.roads:
            roads_by_ward.setdefault(r.ward_code, []).append(r)

        for idx, row in df.iterrows():
            ward = str(row["ward_code"]).strip()
            flat = float(row["lat"])
            flon = float(row["lon"])

            # Spatial resolution rule: Find nearest road segment in same ward
            best_road_id: Optional[str] = None
            best_dist_m: Optional[float] = None
            min_dist = float("inf")

            for r in roads_by_ward.get(ward, []):
                # Distance to segment: min of start, end, and midpoint
                mid_lat = (r.start_lat + r.end_lat) / 2.0
                mid_lon = (r.start_lon + r.end_lon) / 2.0
                d_start = haversine_m(flat, flon, r.start_lat, r.start_lon)
                d_end = haversine_m(flat, flon, r.end_lat, r.end_lon)
                d_mid = haversine_m(flat, flon, mid_lat, mid_lon)
                d = min(d_start, d_end, d_mid)
                if d < min_dist:
                    min_dist = d
                    best_road_id = r.road_id

            if best_road_id:
                best_dist_m = round(min_dist, 2)

            fh = FloodHotspot(
                hotspot_id=str(row["hotspot_id"]).strip(),
                name=str(row["name"]).strip(),
                ward_code=ward,
                lat=flat,
                lon=flon,
                flood_threshold_mm_per_day=float(row["flood_threshold_mm_per_day"]),
                tide_sensitive=_parse_bool(row.get("tide_sensitive")),
                avg_water_depth_cm=float(row["avg_water_depth_cm"]),
                avg_recession_hours=float(row["avg_recession_hours"]),
                pumping_station_nearby=_parse_bool(row.get("pumping_station_nearby")),
                years_flagged_last_5=int(row["years_flagged_last_5"]),
                nearest_road_id=best_road_id,
                distance_to_nearest_road_m=best_dist_m,
                provenance=SourceProvenance(
                    source_file="flood_hotspots.csv",
                    source_record_id=str(row["hotspot_id"]).strip(),
                    row_index=idx
                )
            )
            self.flood_hotspots.append(fh)

            # Record unified environmental observation
            self.environmental_observations.append(
                EnvironmentalObservation(
                    observation_type="flood_hotspot",
                    observation_id=fh.hotspot_id,
                    ward_code=fh.ward_code,
                    details={
                        "name": fh.name,
                        "lat": fh.lat,
                        "lon": fh.lon,
                        "flood_threshold_mm_per_day": fh.flood_threshold_mm_per_day,
                        "tide_sensitive": fh.tide_sensitive,
                        "nearest_road_id": fh.nearest_road_id,
                        "distance_to_nearest_road_m": fh.distance_to_nearest_road_m
                    },
                    provenance=fh.provenance
                )
            )

    def _normalize_rainfall(self):
        df = self.raw_dfs["rainfall_daily.csv"]
        self.rainfall = []
        for idx, row in df.iterrows():
            d_str = _parse_datetime_str(row["date"])
            rf = RainfallDaily(
                date=d_str,
                station=str(row["station"]).strip(),
                rainfall_mm=float(row["rainfall_mm"]),
                imd_category=str(row["imd_category"]).strip(),
                imd_alert=str(row["imd_alert"]).strip(),
                provenance=SourceProvenance(
                    source_file="rainfall_daily.csv",
                    source_record_id=f"{d_str}_{str(row['station']).strip()}",
                    row_index=idx
                )
            )
            self.rainfall.append(rf)
            self.environmental_observations.append(
                EnvironmentalObservation(
                    observation_type="rainfall",
                    observation_id=f"RF_{rf.date}_{rf.station}",
                    date_or_period=rf.date,
                    details={
                        "station": rf.station,
                        "rainfall_mm": rf.rainfall_mm,
                        "imd_category": rf.imd_category,
                        "imd_alert": rf.imd_alert
                    },
                    provenance=rf.provenance
                )
            )

    def _normalize_tides(self):
        df = self.raw_dfs["tides.csv"]
        self.tides = []
        for idx, row in df.iterrows():
            d_str = _parse_datetime_str(row["date"])
            t_str = str(row["high_tide_time"]).strip()
            tr = TideRecord(
                date=d_str,
                high_tide_time=t_str,
                height_m=float(row["height_m"]),
                big_tide_flag=_parse_bool(row.get("big_tide_flag")),
                provenance=SourceProvenance(
                    source_file="tides.csv",
                    source_record_id=f"{d_str}_{t_str}",
                    row_index=idx
                )
            )
            self.tides.append(tr)
            self.environmental_observations.append(
                EnvironmentalObservation(
                    observation_type="tide",
                    observation_id=f"TIDE_{tr.date}_{tr.high_tide_time}",
                    date_or_period=tr.date,
                    details={
                        "high_tide_time": tr.high_tide_time,
                        "height_m": tr.height_m,
                        "big_tide_flag": tr.big_tide_flag
                    },
                    provenance=tr.provenance
                )
            )

    def _normalize_social_posts(self):
        df = self.raw_dfs["social_posts.csv"]
        self.social_posts = []
        for idx, row in df.iterrows():
            self.social_posts.append({
                "post_id": str(row["post_id"]).strip(),
                "posted_at": _parse_datetime_str(row["posted_at"]),
                "source": str(row["source"]).strip(),
                "author_handle": str(row["author_handle"]).strip(),
                "text": str(row["text"]),
                "has_media": _parse_bool(row.get("has_media")),
                "likes_or_forwards": _parse_int(row.get("likes_or_forwards"), 0),
                "provenance": SourceProvenance(
                    source_file="social_posts.csv",
                    source_record_id=str(row["post_id"]).strip(),
                    row_index=idx
                )
            })

    def _normalize_localities(self):
        df = self.raw_dfs["localities.csv"]
        self.localities = []
        for idx, row in df.iterrows():
            aliases_raw = _parse_str(row.get("aliases"))
            aliases_list = [a.strip() for a in aliases_raw.split(";") if a.strip()] if aliases_raw else []
            self.localities.append({
                "locality": str(row["locality"]).strip(),
                "ward_code": str(row["ward_code"]).strip(),
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "aliases": aliases_list,
                "provenance": SourceProvenance(
                    source_file="localities.csv",
                    source_record_id=str(row["locality"]).strip(),
                    row_index=idx
                )
            })
