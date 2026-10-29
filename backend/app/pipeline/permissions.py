"""Who may set which finding resolution. Pure functions so they are easy to test.

Rules (v1, role is sent by the client because there is no login yet; enforce with real auth later):
- cleaner: may set 'found' (item turned up) and may add notes. May set 'open' only to undo a 'found' they set.
           Cannot confirm a loss or dismiss a finding.
- host:    may set any resolution. Only the host can confirm a loss.
"""

CLEANER_ALLOWED = {"found", "open"}


def can_set(role: str, resolution: str, current: str, current_by: str | None) -> bool:
    if role == "host":
        return True
    if role == "cleaner":
        if resolution == "found":
            return current in ("open", "found")
        if resolution == "open":
            return current == "found" and current_by == "cleaner"
    return False


# ---- discrepancy cases and inspections (v2) ----
CLEANER_OUTCOMES = {"found", "restored_to_place"}


def can_resolve(role: str, outcome: str) -> bool:
    """Cleaner can close a case only when the item turned up or was put back. Repairs, replacements and
    formally recording an item as missing are host decisions."""
    return role == "host" or (role == "cleaner" and outcome in CLEANER_OUTCOMES)


def can_assign(role: str) -> bool:
    return role == "host"


def can_approve_exception(role: str) -> bool:
    return role == "host"
