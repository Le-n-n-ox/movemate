"""Rules for inspections, cases and readiness. Pure functions (no database), fully unit tested.

Key ideas
- Cleaning status and inventory status are SEPARATE. A room can be clean but missing a remote.
- Durable items are checked by presence. Consumables are checked by QUANTITY and never 'missing'.
- not_seen (looked, did not find yet) is not missing (confirmed). Confirmed needs a human decision on a case.
- AI suggestions never count as results.
- Inspection complete is not the same as property ready.
"""
from datetime import datetime, timezone

DURABLE_RESULTS = {"ok", "not_seen", "misplaced", "missing", "damaged"}
PROBLEM_RESULTS = {"not_seen", "misplaced", "missing", "damaged"}
CASE_TYPE = {"not_seen": "not_seen", "misplaced": "misplaced", "missing": "missing", "damaged": "damaged"}
GOOD_OUTCOMES = {"found", "restored_to_place", "repaired", "replaced"}  # outcomes that clear a readiness block

CLEANING_TEMPLATES = {
    "bedroom": ["Bed linen changed", "Floor vacuumed", "Surfaces dusted", "Bin emptied"],
    "bathroom": ["Toilet, shower and sink cleaned", "Towels replaced", "Floor washed", "Bin emptied"],
    "kitchen": ["Surfaces and hob wiped", "Fridge cleared", "Dishes put away", "Floor washed", "Bin emptied"],
    "living": ["Surfaces dusted", "Floor vacuumed", "Cushions straightened", "Bin emptied"],
    "balcony": ["Floor swept", "Furniture wiped"],
    "garage": ["Floor swept", "Items tidy"],
    "laundry": ["Machines emptied", "Surfaces wiped"],
    "storage": ["Items tidy"],
    "other": ["Surfaces wiped", "Floor cleaned"],
}


def default_cleaning_checks(room_type: str, inspection_kind: str) -> list[str]:
    """Checkout inspections happen before cleaning, so they carry no cleaning checklist."""
    if inspection_kind == "after_checkout":
        return []
    return list(CLEANING_TEMPLATES.get(room_type, CLEANING_TEMPLATES["other"]))


def section_status(done: int, total: int) -> str:
    if total == 0:
        return "not_applicable"
    return "pending" if done == 0 else "done" if done == total else "in_progress"


def inventory_status(results: list[str]) -> str:
    if not results:
        return "not_applicable"
    pending = sum(1 for r in results if r == "pending")
    return section_status(len(results) - pending, len(results))


def validate_result(*, kind: str, result: str | None, high_value: bool, has_photo: bool, expected: int,
                    observed: int | None, min_quantity: int | None) -> tuple[str | None, int | None, str | None]:
    """Return (final_result, final_observed, error). Error is a message for the user, or None."""
    if kind == "consumable":
        if result in PROBLEM_RESULTS:
            return None, None, "Consumables are checked by quantity, not marked missing. Enter the quantity counted."
        if observed is None:
            return None, None, "Enter the quantity counted."
        low = min_quantity is not None and observed < min_quantity
        return ("low_stock" if low else "ok"), observed, None
    if result is None or result == "pending":
        return None, None, "Choose a result."
    if result not in DURABLE_RESULTS:
        return None, None, "That result does not apply to this item."
    if result == "ok":
        if observed is not None and observed < expected:
            return None, None, f"Only {observed} of {expected} counted. Record it as missing, or count again."
        if high_value and not has_photo:
            return None, None, "High-value item: add a photo before marking it OK."
        return "ok", observed if observed is not None else expected, None
    return result, observed, None


def case_blocks_readiness(case: dict) -> bool:
    """blocks_readiness stays in force until the case is resolved with an outcome that fixes the problem."""
    if not case.get("blocks_readiness"):
        return False
    return not (case.get("status") == "resolved" and case.get("outcome") in GOOD_OUTCOMES)


def compute_blockers(rooms: list[dict], cases: list[dict]) -> list[str]:
    """What stops an inspection from being completed. rooms: {name, results:[...], cleaning_open:int}.
    cases: {item_label, type, status}."""
    out = []
    for r in rooms:
        pending = sum(1 for x in r["results"] if x == "pending")
        if pending:
            out.append(f"{r['name']}: {pending} item{'s' if pending != 1 else ''} not checked yet")
        if r["cleaning_open"]:
            n = r["cleaning_open"]
            out.append(f"{r['name']}: {n} cleaning task{'s' if n != 1 else ''} not done")
    for c in cases:
        if c["status"] != "resolved":
            out.append(f"Open case: {c['item_label']} ({c['type'].replace('_', ' ')})")
    return out


def overall_status(statuses: list[str]) -> str:
    sts = [s for s in statuses if s != "not_applicable"]
    if not sts:
        return "not_applicable"
    if all(s == "done" for s in sts):
        return "done"
    if all(s == "pending" for s in sts):
        return "pending"
    return "in_progress"


def readiness_status(*, inspection_status: str, cases: list[dict]) -> str:
    """ready | ready_with_exceptions | not_ready. A booking never certifies readiness; checks do."""
    if inspection_status == "in_progress":
        return "not_ready"
    if any(case_blocks_readiness(c) for c in cases):
        return "not_ready"
    if inspection_status == "completed_with_exception":
        return "ready_with_exceptions"
    return "ready"


def summary_line(status: str, blocking: list[str], gaps: list[str], low_stock: list[str]) -> str:
    if status == "not_ready":
        return f"Not ready: {len(blocking)} thing{'s' if len(blocking) != 1 else ''} need attention."
    extras = []
    if gaps:
        extras.append(f"{len(gaps)} known gap{'s' if len(gaps) != 1 else ''}")
    if low_stock:
        extras.append(f"{len(low_stock)} item{'s' if len(low_stock) != 1 else ''} to restock")
    base = "Ready for the next guest" if status == "ready" else "Ready, with approved exceptions"
    return base + (f" ({', '.join(extras)})." if extras else ".")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
