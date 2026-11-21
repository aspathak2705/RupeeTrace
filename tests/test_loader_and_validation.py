import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rupeetrace.data.data_loader import DataLoader
from rupeetrace.data.validation_service import ValidationService

def test_data_loader_and_validation():
    loader = DataLoader()
    stats = loader.load_all()

    # 1. Check loaded row counts
    assert stats["wards_count"] == 24
    assert stats["roads_count"] == 291
    assert stats["contractors_count"] == 8
    assert stats["rate_cards_count"] == 10
    assert stats["work_orders_count"] == 2499
    assert stats["complaints_count"] == 6501
    assert stats["complaints_sample_count"] == 200
    assert stats["traffic_count"] == 291
    assert stats["accidents_count"] == 420
    assert stats["facilities_count"] == 160
    assert stats["flood_hotspots_count"] == 28

    # 2. Run full validation suite
    validator = ValidationService(loader)
    report = validator.run_full_validation()

    assert report["status"] == "PASS"
    assert len(report["missing_columns"]) == 0

    # Ensure all primary keys unique
    for fname, pk_info in report["duplicate_primary_keys"].items():
        assert pk_info["duplicates_found"] == 0, f"Duplicate PK in {fname}"

    # Ensure foreign keys resolve cleanly
    fks = report["foreign_key_integrity"]
    assert fks["work_orders_to_roads"]["unmatched_count"] == 0
    assert fks["work_orders_to_wards"]["unmatched_count"] == 0
    assert fks["work_orders_to_contractors"]["unmatched_count"] == 0
    assert fks["work_orders_to_rate_card"]["unmatched_count"] == 0
    assert fks["work_orders_to_complaints"]["unmatched_count"] == 0

    # Ensure rate card mapping is 100%
    assert report["rate_card_mappings"]["mapping_coverage_pct"] == 100.0

if __name__ == "__main__":
    test_data_loader_and_validation()
    print("DataLoader & Validation tests PASSED!")
