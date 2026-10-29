"""Printable room inventory sheet (HTML). Pure function, so it is easy to test."""
from html import escape

CSS = """body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#1c1917}h1{margin:0 0 4px}h2{margin:18px 0 6px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}
th{background:#eee}.box{width:18px;height:18px;border:1.5px solid #333;display:inline-block}.muted{color:#666;font-size:12px}
img.ref{max-width:100%;max-height:260px}img.crop{width:56px;height:56px;object-fit:cover}.hi{font-weight:bold}
@media print{.noprint{display:none}}"""


def render_room_sheet(property_name: str, room_name: str, rules: str | None, ref_photo_url: str | None,
                      rows: list[dict], generated: str) -> str:
    """rows: {label, quantity, kind, location, alternates (list), high_value, availability, notes, crop_url}"""
    body = []
    for r in rows:
        alts = ", ".join(r.get("alternates") or [])
        flags = []
        if r.get("high_value"):
            flags.append("HIGH VALUE")
        if r.get("availability") == "staff_only":
            flags.append("staff only")
        crop = f'<img class="crop" src="{escape(r["crop_url"])}" alt="">' if r.get("crop_url") else ""
        qty = f'{r["quantity"]}' + (" (consumable)" if r.get("kind") == "consumable" else "")
        body.append(
            f'<tr><td><span class="box"></span></td><td>{crop}</td>'
            f'<td class="{"hi" if r.get("high_value") else ""}">{escape(r["label"])}'
            f'<div class="muted">{escape(", ".join(flags))}</div></td>'
            f'<td>{escape(qty)}</td><td>{escape(r.get("kind") or "")}</td>'
            f'<td>{escape(r.get("location") or "")}'
            f'<div class="muted">{("Also OK: " + escape(alts)) if alts else ""}</div></td>'
            f'<td>{escape(r.get("notes") or "")}</td><td></td></tr>')
    ref = f'<h2>Reference photo</h2><img class="ref" src="{escape(ref_photo_url)}" alt="">' if ref_photo_url else ""
    rules_html = f'<h2>House rules and procedures</h2><p>{escape(rules)}</p>' if rules else ""
    return (f'<!doctype html><html><head><meta charset="utf-8"><title>{escape(room_name)} inventory</title>'
            f'<style>{CSS}</style></head><body>'
            f'<button class="noprint" onclick="window.print()">Print</button>'
            f'<h1>{escape(property_name)}: {escape(room_name)}</h1>'
            f'<div class="muted">Room inventory sheet. Generated {escape(generated)}. Tick each item. Note anything missing, moved or damaged.</div>'
            f'{ref}<h2>Items ({len(rows)})</h2>'
            f'<table><tr><th></th><th></th><th>Item</th><th>Qty</th><th>Type</th><th>Where it belongs</th><th>Notes</th><th>Found / note</th></tr>'
            f'{"".join(body) or "<tr><td colspan=8>No confirmed items yet.</td></tr>"}</table>{rules_html}</body></html>')
