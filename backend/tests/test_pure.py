"""Unit tests for pure modules: inspection_logic, verdicts, permissions."""
import pytest

from app.pipeline.permissions import can_set, can_resolve, can_assign, can_approve_exception


class TestPermissions:
    def test_host_can_set_anything(self):
        for res in ["open", "found", "confirmed", "dismissed"]:
            assert can_set("host", res, "open", None) is True

    def test_cleaner_can_set_found(self):
        assert can_set("cleaner", "found", "open", None) is True
        assert can_set("cleaner", "found", "found", "cleaner") is True

    def test_cleaner_cannot_set_found_from_confirmed(self):
        assert can_set("cleaner", "found", "confirmed", "host") is False

    def test_cleaner_can_undo_own_found(self):
        assert can_set("cleaner", "open", "found", "cleaner") is True

    def test_cleaner_cannot_undo_host_found(self):
        assert can_set("cleaner", "open", "found", "host") is False

    def test_cleaner_cannot_confirm(self):
        assert can_set("cleaner", "confirmed", "open", None) is False

    def test_cleaner_cannot_dismiss(self):
        assert can_set("cleaner", "dismissed", "open", None) is False

    def test_cleaner_outcomes(self):
        assert can_resolve("cleaner", "found") is True
        assert can_resolve("cleaner", "restored_to_place") is True
        assert can_resolve("cleaner", "repaired") is False
        assert can_resolve("cleaner", "replaced") is False
        assert can_resolve("cleaner", "recorded_missing") is False

    def test_host_can_resolve_any(self):
        for outcome in ["found", "restored_to_place", "repaired", "replaced", "recorded_missing"]:
            assert can_resolve("host", outcome) is True

    def test_assign_host_only(self):
        assert can_assign("host") is True
        assert can_assign("cleaner") is False

    def test_exception_host_only(self):
        assert can_approve_exception("host") is True
        assert can_approve_exception("cleaner") is False


from app.pipeline.inspection_logic import (
    DURABLE_RESULTS,
    PROBLEM_RESULTS,
    validate_result,
    case_blocks_readiness,
    compute_blockers,
    overall_status,
    readiness_status,
    summary_line,
    section_status,
    inventory_status,
)


class TestValidateResult:
    def test_consumable_below_min(self):
        result, observed, error = validate_result(
            kind="consumable", result=None, high_value=False, has_photo=False,
            expected=1, observed=0, min_quantity=2
        )
        assert result == "low_stock"
        assert observed == 0
        assert error is None

    def test_consumable_ok(self):
        result, observed, error = validate_result(
            kind="consumable", result=None, high_value=False, has_photo=False,
            expected=1, observed=5, min_quantity=2
        )
        assert result == "ok"
        assert observed == 5
        assert error is None

    def test_consumable_missing_result_rejected(self):
        result, observed, error = validate_result(
            kind="consumable", result="missing", high_value=False, has_photo=False,
            expected=1, observed=5, min_quantity=2
        )
        assert error is not None
        assert "checked by quantity" in error

    def test_consumable_no_quantity(self):
        result, observed, error = validate_result(
            kind="consumable", result=None, high_value=False, has_photo=False,
            expected=1, observed=None, min_quantity=2
        )
        assert error is not None
        assert "quantity" in error.lower()

    def test_durable_ok_with_low_count_rejected(self):
        result, observed, error = validate_result(
            kind="movable", result="ok", high_value=False, has_photo=False,
            expected=4, observed=2, min_quantity=None
        )
        assert error is not None
        assert "2 of 4" in error

    def test_high_value_needs_photo(self):
        result, observed, error = validate_result(
            kind="movable", result="ok", high_value=True, has_photo=False,
            expected=1, observed=1, min_quantity=None
        )
        assert error is not None
        assert "photo" in error.lower()

    def test_high_value_ok_with_photo(self):
        result, observed, error = validate_result(
            kind="movable", result="ok", high_value=True, has_photo=True,
            expected=1, observed=1, min_quantity=None
        )
        assert result == "ok"
        assert error is None

    def test_pending_rejected(self):
        result, observed, error = validate_result(
            kind="movable", result="pending", high_value=False, has_photo=False,
            expected=1, observed=1, min_quantity=None
        )
        assert error is not None

    def test_ok_defaults_observed_to_expected(self):
        result, observed, error = validate_result(
            kind="movable", result="ok", high_value=False, has_photo=False,
            expected=4, observed=None, min_quantity=None
        )
        assert result == "ok"
        assert observed == 4


class TestCaseBlocksReadiness:
    def test_blocks_when_open(self):
        case = {"blocks_readiness": True, "status": "open", "outcome": None}
        assert case_blocks_readiness(case) is True

    def test_blocks_when_investigating(self):
        case = {"blocks_readiness": True, "status": "investigating", "outcome": None}
        assert case_blocks_readiness(case) is True

    def test_resolved_good_outcome_clears(self):
        for outcome in ["found", "restored_to_place", "repaired", "replaced"]:
            case = {"blocks_readiness": True, "status": "resolved", "outcome": outcome}
            assert case_blocks_readiness(case) is False, f"Should clear for {outcome}"

    def test_resolved_recorded_missing_still_blocks(self):
        case = {"blocks_readiness": True, "status": "resolved", "outcome": "recorded_missing"}
        assert case_blocks_readiness(case) is True

    def test_not_blocking(self):
        case = {"blocks_readiness": False, "status": "open", "outcome": None}
        assert case_blocks_readiness(case) is False


class TestComputeBlockers:
    def test_pending_items(self):
        rooms = [{"name": "Kitchen", "results": ["pending", "ok"], "cleaning_open": 0}]
        blockers = compute_blockers(rooms, [])
        assert len(blockers) == 1
        assert "1 item" in blockers[0]

    def test_cleaning_tasks(self):
        rooms = [{"name": "Bathroom", "results": ["ok"], "cleaning_open": 2}]
        blockers = compute_blockers(rooms, [])
        assert any("cleaning" in b for b in blockers)

    def test_open_case(self):
        rooms = [{"name": "Living", "results": ["ok"], "cleaning_open": 0}]
        cases = [{"item_label": "Remote", "type": "missing", "status": "open"}]
        blockers = compute_blockers(rooms, cases)
        assert any("Remote" in b for b in blockers)

    def test_no_blockers(self):
        rooms = [{"name": "Living", "results": ["ok", "ok"], "cleaning_open": 0}]
        blockers = compute_blockers(rooms, [])
        assert blockers == []


class TestOverallStatus:
    def test_all_done(self):
        assert overall_status(["done", "done"]) == "done"

    def test_all_pending(self):
        assert overall_status(["pending", "pending"]) == "pending"

    def test_mixed(self):
        assert overall_status(["pending", "done"]) == "in_progress"

    def test_not_applicable_only(self):
        assert overall_status(["not_applicable"]) == "not_applicable"

    def test_empty(self):
        assert overall_status([]) == "not_applicable"


class TestReadinessStatus:
    def test_in_progress(self):
        assert readiness_status(inspection_status="in_progress", cases=[]) == "not_ready"

    def test_ready(self):
        assert readiness_status(inspection_status="completed", cases=[]) == "ready"

    def test_ready_with_exceptions(self):
        assert readiness_status(inspection_status="completed_with_exception", cases=[]) == "ready_with_exceptions"

    def test_blocking_case(self):
        cases = [{"blocks_readiness": True, "status": "open", "outcome": None}]
        assert readiness_status(inspection_status="completed", cases=cases) == "not_ready"


class TestSummaryLine:
    def test_not_ready(self):
        line = summary_line("not_ready", ["case1"], [], [])
        assert "Not ready" in line

    def test_ready(self):
        line = summary_line("ready", [], [], [])
        assert "Ready for the next guest" in line

    def test_ready_with_gaps(self):
        line = summary_line("ready", [], ["gap1", "gap2"], [])
        assert "2 known gaps" in line


class TestSectionStatus:
    def test_no_items(self):
        assert section_status(0, 0) == "not_applicable"

    def test_all_done(self):
        assert section_status(3, 3) == "done"

    def test_none_done(self):
        assert section_status(0, 3) == "pending"

    def test_partial(self):
        assert section_status(1, 3) == "in_progress"


class TestInventoryStatus:
    def test_empty(self):
        assert inventory_status([]) == "not_applicable"

    def test_all_pending(self):
        assert inventory_status(["pending", "pending"]) == "pending"

    def test_all_done(self):
        assert inventory_status(["ok", "ok"]) == "done"
