import os
import subprocess
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DATA_DIR"] = tempfile.mkdtemp()
os.environ["MOCK_MODELS"] = "true"
os.environ["APP_ENV"] = "dev"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def make_video() -> bytes:
    with tempfile.TemporaryDirectory() as d:
        out = f"{d}/v.mp4"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=duration=4:size=320x240:rate=10",
                        "-pix_fmt", "yuv420p", out], check=True)
        return open(out, "rb").read()


def test_full_flow():
    with TestClient(app) as c:
        assert c.get("/api/health").json()["mock_models"] is True
        seed = c.post("/api/dev/seed").json()
        pid = seed["property_id"]
        prop = c.get(f"/api/properties/{pid}").json()
        assert len(prop["rooms"]) == 3   # Living room, Kitchen, Bathroom

        living = seed["room_ids"][0]
        items = c.get(f"/api/rooms/{living}/items").json()
        assert any(i["status"] == "suggested" for i in items)
        assert c.post(f"/api/rooms/{living}/items/confirm-all").json()["confirmed"] == 1

        # baseline photo (use a seeded source image as the upload)
        img = c.get(items[0]["source_image_url"].replace("http://localhost:8000", "")).content
        r = c.post(f"/api/rooms/{living}/baseline/photo", files={"file": ("a.jpg", img, "image/jpeg")})
        assert r.status_code == 200 and len(r.json()["items"]) == 3

        # audit with a real video
        audit = c.post(f"/api/properties/{pid}/audits").json()
        aid = audit["id"]
        vid = make_video()
        up = c.post(f"/api/audits/{aid}/rooms/{living}/video", files={"file": ("v.mp4", vid, "video/mp4")})
        assert up.status_code == 200 and up.json()["frames"] >= 4
        kitchen = seed["room_ids"][1]
        c.post(f"/api/audits/{aid}/rooms/{kitchen}/video", files={"file": ("v.mp4", vid, "video/mp4")})
        assert c.post(f"/api/audits/{aid}/run").status_code == 202
        d = c.get(f"/api/audits/{aid}").json()  # background task runs before TestClient returns
        assert d["status"] == "done", d
        types = sorted(f["type"] for f in d["findings"])
        assert types == ["count_mismatch", "misplaced", "misplaced", "missing", "unverified"], types
        moved = [f for f in d["findings"] if f["type"] == "misplaced"]
        assert any("sofa" in f["observed"] for f in moved)                     # moved within the room
        assert any("Found in Living room" in f["observed"] for f in moved)    # found in another room
        assert all(f["evidence_frame_url"] for f in moved)
        missing = next(f for f in d["findings"] if f["type"] == "missing")
        assert missing["reference_crop_url"]
        fid = missing["id"]
        # cleaner cannot confirm or dismiss
        assert c.patch(f"/api/findings/{fid}", json={"role": "cleaner", "resolution": "confirmed"}).status_code == 403
        assert c.patch(f"/api/findings/{fid}", json={"role": "cleaner", "resolution": "dismissed"}).status_code == 403
        # cleaner can mark found, with a note
        f = c.patch(f"/api/findings/{fid}", json={"role": "cleaner", "resolution": "found", "note": "It was in the drawer"}).json()
        assert f["resolution"] == "found" and f["resolved_by"] == "cleaner" and f["note"] == "It was in the drawer"
        # host has the final say
        f = c.patch(f"/api/findings/{fid}", json={"role": "host", "resolution": "confirmed"}).json()
        assert f["resolution"] == "confirmed" and f["resolved_by"] == "host" and f["resolved_at"]
        # cleaner cannot undo a host decision
        assert c.patch(f"/api/findings/{fid}", json={"role": "cleaner", "resolution": "found"}).status_code == 403
        # missing role is rejected by validation
        assert c.patch(f"/api/findings/{fid}", json={"resolution": "dismissed"}).status_code == 422

        # guest
        token = seed["guest_token"]
        assert c.get(f"/api/guest/{token}").json()["item_labels"]
        ans = c.post(f"/api/guest/{token}/ask", files={"file": ("g.jpg", img, "image/jpeg")}).json()
        assert "matched" in ans and ans["message"]
        assert c.get("/api/guest/nope").status_code == 404


def jpeg() -> bytes:
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (320, 240), (180, 120, 90)).save(buf, "JPEG")
    return buf.getvalue()


def test_property_inspection_and_cases():
    with TestClient(app) as c:
        seed = c.post("/api/dev/seed").json()
        pid = seed["property_id"]
        living, kitchen, bath = seed["room_ids"]

        # property details, room types, nested locations
        p = c.get(f"/api/properties/{pid}").json()
        assert p["address"] and p["capacity"] == 4 and p["rules"] and p["property_type"] == "apartment"
        assert [r["room_type"] for r in p["rooms"]] == ["living", "kitchen", "bathroom"]
        assert c.patch(f"/api/properties/{pid}", json={"capacity": 6}).json()["capacity"] == 6
        locs = c.get(f"/api/rooms/{kitchen}/locations").json()
        assert [l["path"] for l in locs] == ["Kitchen > Under-sink cupboard", "Kitchen > Upper cupboard", "Kitchen > Upper cupboard > Left shelf"]
        rack = c.post(f"/api/properties/{pid}/rooms", json={"name": "Spice rack", "parent_id": locs[2]["id"]}).json()
        assert rack["path"] == "Kitchen > Upper cupboard > Left shelf > Spice rack"
        salt = c.post(f"/api/rooms/{rack['id']}/items", json={"label": "Salt", "quantity": 2, "kind": "consumable", "min_quantity": 1}).json()
        assert salt["room_id"] == kitchen and salt["location_path"].endswith("Spice rack")
        ref = c.post(f"/api/rooms/{living}/photo", files={"file": ("r.jpg", jpeg(), "image/jpeg")}).json()
        assert ref["reference_photo_url"]

        # condition history
        r = c.post(f"/api/items/{salt['id']}/condition", data={"condition": "worn", "note": "Faded", "actor": "Sam", "role": "cleaner"},
                   files={"file": ("c.jpg", jpeg(), "image/jpeg")}).json()
        assert r["condition"] == "worn"
        h = c.get(f"/api/items/{salt['id']}/history").json()
        assert h[0]["condition"] == "worn" and h[0]["previous"] == "good" and h[0]["actor"] == "Sam" and h[0]["photo_url"]
        assert c.post(f"/api/items/{salt['id']}/condition", data={"condition": "broken"}).status_code == 400

        # staff-only items are hidden from guests, house rules are shown
        g = c.get(f"/api/guest/{seed['guest_token']}").json()
        assert "Cleaning supplies" not in g["item_labels"] and "Nespresso Vertuo Plus" in g["item_labels"] and g["house_rules"]

        # printable sheet
        sheet = c.get(f"/api/rooms/{kitchen}/sheet")
        assert sheet.status_code == 200 and "text/html" in sheet.headers["content-type"]
        assert "Coffee pods" in sheet.text and "staff only" in sheet.text

        # inspection checklist from inventory
        insp = c.post(f"/api/properties/{pid}/inspections", json={"kind": "after_cleaning", "inspector": "Sam", "reservation_ref": "RES-1"}).json()
        iid = insp["id"]
        d = c.get(f"/api/inspections/{iid}").json()
        assert not d["can_complete"] and d["blockers"]
        items = {i["label"]: i for r_ in d["rooms"] for i in r_["items"]}
        assert {"Coffee pods", "Salt", "Cleaning supplies", "Samsung Smart TV", "Toilet paper rolls"} <= set(items)
        assert all(r_["cleaning"] for r_ in d["rooms"])
        assert all(r_["inventory_status"] == "pending" and r_["cleaning_status"] == "pending" for r_ in d["rooms"])
        assert c.post(f"/api/inspections/{iid}/complete", json={"role": "cleaner", "actor": "Sam"}).status_code == 409
        assert c.post(f"/api/inspections/{iid}/complete", json={"role": "host", "actor": "Hana"}).status_code == 422  # exception needs a note

        def setr(label, **kw):
            return c.patch(f"/api/inspection-items/{items[label]['id']}", json={"role": "cleaner", "actor": "Sam", **kw})

        def photo(label):
            return c.post(f"/api/inspection-items/{items[label]['id']}/photo", files={"file": ("p.jpg", jpeg(), "image/jpeg")},
                          data={"actor": "Sam", "role": "cleaner"})

        # extra verification for high-value items
        assert setr("Samsung Smart TV", result="ok").status_code == 422
        assert photo("Samsung Smart TV").status_code == 200
        assert setr("Samsung Smart TV", result="ok").json()["result"] == "ok"
        # quantities: 3 of 4 cannot be OK
        assert setr("Wine glass set", result="ok", observed_quantity=3).status_code == 422
        w = setr("Wine glass set", result="missing", observed_quantity=3).json()
        assert w["result"] == "missing" and w["discrepancy_id"]
        # consumables are counted, never missing
        assert setr("Coffee pods", result="missing").status_code == 422
        assert setr("Coffee pods", observed_quantity=4).json()["result"] == "low_stock"
        assert setr("Toilet paper rolls", observed_quantity=12).json()["result"] == "ok"
        # not seen is not the same as confirmed missing
        roku = setr("Black Roku remote", result="not_seen").json()
        assert roku["discrepancy_id"]
        assert setr("Black Roku remote", result="ok").status_code == 409     # an open case must be resolved first
        # finish everything else
        for label, it in items.items():
            if it["result"] != "pending" or label in ("Samsung Smart TV", "Wine glass set", "Coffee pods", "Toilet paper rolls", "Black Roku remote"):
                continue
            if it["high_value"]:
                assert photo(label).status_code == 200
            if it["kind"] == "consumable":
                assert setr(label, observed_quantity=it["expected_quantity"]).status_code == 200
            else:
                assert setr(label, result="ok").status_code == 200
        d = c.get(f"/api/inspections/{iid}").json()
        assert all(r_["inventory_status"] == "done" for r_ in d["rooms"])
        assert all(r_["cleaning_status"] == "pending" for r_ in d["rooms"])    # clean and inventory are separate statuses
        for r_ in d["rooms"]:
            for ch in r_["cleaning"]:
                assert c.patch(f"/api/cleaning-checks/{ch['id']}", json={"actor": "Sam", "done": True}).json()["done"]
        d = c.get(f"/api/inspections/{iid}").json()
        assert all(r_["cleaning_status"] == "done" for r_ in d["rooms"])
        assert not d["can_complete"] and any("Open case" in b for b in d["blockers"])

        # case workflow: detect, verify, assign, resolve
        cases = c.get(f"/api/properties/{pid}/discrepancies").json()
        assert {x["type"] for x in cases} == {"not_seen", "missing"}
        rk = next(x for x in cases if x["item_label"] == "Black Roku remote")
        wg = next(x for x in cases if x["item_label"] == "Wine glass set")
        ev = c.post(f"/api/discrepancies/{rk['id']}/events", data={"role": "cleaner", "actor": "Sam", "kind": "search", "text": "Checked sofa and drawers"}).json()
        assert ev["kind"] == "search"
        detail = c.get(f"/api/discrepancies/{rk['id']}").json()
        assert detail["status"] == "investigating" and len(detail["events"]) == 2 and detail["expected_location"]
        assert c.patch(f"/api/discrepancies/{rk['id']}", json={"role": "cleaner", "assigned_to": "Hana"}).status_code == 403
        assert c.patch(f"/api/discrepancies/{rk['id']}", json={"role": "host", "actor": "Hana", "assigned_to": "Sam"}).json()["assigned_to"] == "Sam"
        assert c.post(f"/api/discrepancies/{rk['id']}/resolve", json={"role": "cleaner", "outcome": "recorded_missing"}).status_code == 403
        res = c.post(f"/api/discrepancies/{rk['id']}/resolve", json={"role": "cleaner", "actor": "Sam", "outcome": "found", "note": "In the drawer"}).json()
        assert res["status"] == "resolved" and res["outcome"] == "found"
        assert c.post(f"/api/discrepancies/{rk['id']}/resolve", json={"role": "host", "outcome": "found"}).status_code == 409   # already resolved
        # host formally records the wine glasses as missing; the item condition follows and history keeps it
        assert c.post(f"/api/discrepancies/{wg['id']}/resolve", json={"role": "host", "actor": "Hana", "outcome": "recorded_missing"}).json()["status"] == "resolved"
        glass = next(i for i in c.get(f"/api/rooms/{living}/items").json() if i["label"] == "Wine glass set")
        assert glass["condition"] == "missing"
        assert c.get(f"/api/items/{glass['id']}/history").json()[0]["condition"] == "missing"

        # now it can be completed, and the readiness report separates clean from inventory
        d = c.get(f"/api/inspections/{iid}").json()
        assert d["can_complete"] and d["blockers"] == []
        done = c.post(f"/api/inspections/{iid}/complete", json={"role": "cleaner", "actor": "Sam"}).json()
        assert done["status"] == "completed" and done["completed_at"]
        assert setr("Bath towels", result="ok").status_code == 409                  # completed inspections are frozen
        rd = c.get(f"/api/inspections/{iid}/readiness").json()
        assert rd["status"] == "ready" and rd["cleaning_status"] == "done" and rd["inventory_status"] == "done"
        assert any("Wine glass set" in g_ for g_ in rd["known_gaps"]) and any("Coffee pods" in l for l in rd["low_stock"])
        assert "known gap" in rd["summary"] and rd["reservation_ref"] == "RES-1"

        # next inspection: known-missing items are not re-checked; AI hints stay separate from results
        insp2 = c.post(f"/api/properties/{pid}/inspections", json={"kind": "before_checkin", "inspector": "Sam"}).json()
        d2 = c.get(f"/api/inspections/{insp2['id']}").json()
        assert "Wine glass set" not in {i["label"] for r_ in d2["rooms"] for i in r_["items"]}
        audit = c.post(f"/api/properties/{pid}/audits").json()
        vid = make_video()
        for rid in (living, kitchen):
            assert c.post(f"/api/audits/{audit['id']}/rooms/{rid}/video", files={"file": ("v.mp4", vid, "video/mp4")}).status_code == 200
        assert c.post(f"/api/audits/{audit['id']}/run").status_code == 202
        assert c.post(f"/api/inspections/{insp2['id']}/ai-suggestions", json={"audit_id": audit["id"]}).json()["applied"] == 4
        d2 = c.get(f"/api/inspections/{insp2['id']}").json()
        roku2 = next(i for r_ in d2["rooms"] for i in r_["items"] if i["label"] == "Black Roku remote")
        assert roku2["ai_suggestion"]["type"] == "missing" and roku2["result"] == "pending"   # a hint, not a result
        # only the host can approve an exception, and it must carry a note
        assert c.post(f"/api/inspections/{insp2['id']}/complete", json={"role": "cleaner"}).status_code == 409
        ex = c.post(f"/api/inspections/{insp2['id']}/complete", json={"role": "host", "actor": "Hana", "exception_note": "Guest arrives early, remaining checks done at arrival"}).json()
        assert ex["status"] == "completed_with_exception" and ex["exception_by"] == "Hana"
        assert c.get(f"/api/inspections/{insp2['id']}/readiness").json()["status"] == "ready_with_exceptions"
