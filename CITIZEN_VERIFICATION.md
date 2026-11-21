# Citizen Verification & Discrepancy Detection

## 1. Objective

> **"Did the work actually happen, and did it deliver the promised result?"**

Citizen Verification links the public asset ledger (Road Passport) directly to physical field observations. Visual ground evidence acts as supporting scrutiny to hold municipal contractors accountable.

---

## 2. The 7-Stage Verification Lifecycle

1. **Before-Work Evidence**: Initial citizen complaint photos and baseline road geometry.
2. **Work-in-Progress Evidence**: Site barricading and milling documentation.
3. **Contractor-Submitted Completion**: Contractor finish photo and Measurement Book reference.
4. **Officer Technical Review**: Junior Engineer joint site measurement.
5. **Citizen Verification**: Independent ground observations submitted by local residents.
6. **Post-Completion Observations**: 30-day and 90-day monsoon durability checks.
7. **Final Verification Summary**: Reconciled status recorded in public ledger.

---

## 3. Automated Discrepancy Detection Rules

The engine automatically scans reports for conflicts and sets the status to **`Conflicting Evidence`**:
- **Completion vs Damage**: Contractor marks work order complete, but a citizen reports visible damage, potholes, or incomplete work.
- **Premature Reopening**: Surface stripping observed within 30 days of repair.
- **Location Mismatch**: Repaired road segment does not match the sanctioned chainage.
- **Drainage Failure**: Waterlogging reported after drainage desilting work orders.

When conflicting evidence is detected, the system immediately flags the asset for a **Joint Site Inspection**, preventing fraudulent sign-offs.
