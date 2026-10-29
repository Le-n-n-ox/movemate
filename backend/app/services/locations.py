"""Room and sub-location helpers (Kitchen > Upper cupboard > Left shelf)."""
from sqlalchemy.orm import Session

from ..models import Room


def room_path(db: Session, room_id: str | None) -> str | None:
    if not room_id:
        return None
    names, cur, guard = [], db.get(Room, room_id), 0
    while cur is not None and guard < 12:
        names.append(cur.name)
        cur = db.get(Room, cur.parent_id) if cur.parent_id else None
        guard += 1
    return " > ".join(reversed(names)) if names else None


def root_room(db: Session, room: Room) -> Room:
    cur, guard = room, 0
    while cur.parent_id and guard < 12:
        parent = db.get(Room, cur.parent_id)
        if parent is None:
            break
        cur, guard = parent, guard + 1
    return cur
