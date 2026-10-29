# MoveMate API contract (v2)

Source of truth in code: `backend/app/schemas.py`. Frontend mirror: `frontend/lib/types.ts`.
Live docs: http://localhost:8000/docs

**Change rule:** any change to an endpoint, field, or enum is ONE pull request that edits `backend/app/schemas.py`, `frontend/lib/types.ts` and this file together. Both owners approve it. Never rename or remove a field without asking; add new optional fields instead.

## Conventions

- **Base URLs.** Backend http://localhost:8000. The browser calls it directly using NEXT_PUBLIC_API_URL. Interactive docs at http://localhost:8000/docs are the live version of this contract.
- **IDs and times.** All ids are strings (UUIDs). Timestamps are ISO 8601 strings.
- **Media URLs.** Every *_url field is an absolute URL, ready for an img src. The frontend never builds media URLs.
- **Boxes.** Normalized 0..1 {x, y, w, h}. Multiply by the displayed image size to draw.
- **Uploads.** multipart/form-data. Field is 'file' for one file and 'files' for several. Images max 15 MB, videos max 150 MB.
- **Errors.** Non-2xx responses carry JSON {"detail": "human readable message"}. 400 bad input, 404 not found, 409 audit already running or action not allowed in the current state (inspection completed, case resolved, checks pending), 413 file too large, 422 unreadable video.
- **Long work.** Audits run in the background. POST /run returns 202 at once. Poll GET /audits/{id} every 2 seconds until status is done or failed. The 'stage' text is shown to the user.
- **Auth.** None in v1 (hackathon). Guest access is by the unguessable guest_token. Add host auth after the demo.
- **Item lifecycle.** New scan items are 'suggested'. Only 'confirmed' items are used for guest answers, audits and inspections. Guests never see staff_only items.
- **Two kinds of check.** An AI video check (audit) produces suggestions. An inspection is the human checklist and the only thing that produces results, cases and readiness. The two connect only through POST /inspections/{id}/ai-suggestions, which fills hints.
- **Cleaning vs inventory.** Every room in an inspection has two separate statuses: cleaning_status and inventory_status. Cleaned does not mean complete, and complete does not mean ready.
- **Consumables.** Counted by quantity, never marked missing. Below min_quantity the result becomes low_stock. They are excluded from AI video checks.
- **Not seen is not missing.** 'not_seen' means nobody could confirm the item. Only a person (or the host on a case) records 'missing'. The AI never does.
- **Inspection rules (422 if broken).** High-value items need a photo before OK. A counted quantity below expected cannot be OK. Not seen, misplaced, missing and damaged open a case automatically, and the item cannot be flipped to OK while that case is open (409). Completing is blocked (409) while checks are pending or cases are unresolved, unless the host completes with an exception_note. An exception never hides an essential (blocks_readiness) gap.
- **Cases.** A case is a factual record with an append-only event trail. Statuses: open, investigating, resolved. Cleaners may log searches and notes and resolve only as found or restored_to_place. Only the host may assign, mark blocks_readiness, or resolve as repaired, replaced or recorded_missing (403 otherwise). An item recorded missing is skipped in the next inspection and listed under known_gaps.
- **Readiness.** ready = no blockers and no exception. ready_with_exceptions = host exception, no essential gaps. not_ready = any essential gap, open blocking case, or unfinished room.
- **Roles on bodies.** Every write that has a rule carries role ('cleaner'|'host') and actor (a name). The name is stored for the audit trail. Both are stand-ins until real login exists.
- **Roles (v1, no login).** The client sends role 'cleaner' or 'host' with every finding update. The frontend picks it from the link: /audit/{id}?role=host for the host, ?role=cleaner (the default) for the cleaner. This is a stand-in for real login; it is not secure. Add auth before real users.
- **Who may resolve a finding.** Cleaner: may set 'found' (item turned up) and add a note; may 'open' again only to undo their own 'found'. Cannot confirm or dismiss. Host: may set any resolution, and only the host can confirm a loss. Not allowed -> HTTP 403. Missing role -> HTTP 422. (Applies to AI video check findings. Inspections and cases have their own rules above.)
- **Finding rules.** 'unverified' means the camera did not cover the spot, never an accusation. 'missing' is only produced at confidence >= 0.7. 'misplaced' means the item WAS seen but not in its usual place: either elsewhere in its room, or in another room (the observed text says where). 'count_mismatch' means fewer units seen than the saved quantity.

## Endpoints

| Method | Path | Request | Response | Frontend use |
|---|---|---|---|---|
| GET | `/api/health` | - | Health | dev banner |
| POST | `/api/dev/seed` | - | SeedResult | Properties page button |
| GET | `/api/properties` | - | PropertyOut[] | Properties list |
| POST | `/api/properties` | JSON PropertyCreate {name, address?, property_type?, capacity?, details?, rules?} | PropertyOut | Properties list |
| PATCH | `/api/properties/{id}` | JSON PropertyPatch | PropertyOut | Property page |
| GET | `/api/properties/{id}` | - | PropertyDetail | Property page |
| POST | `/api/properties/{id}/rooms` | JSON {name, room_type?, parent_id?} | RoomOut | Property page, Room page |
| GET | `/api/rooms/{room_id}` | - | RoomOut | Room page |
| PATCH | `/api/rooms/{room_id}` | JSON {name?, room_type?} | RoomOut | Room page |
| GET | `/api/rooms/{room_id}/locations` | - | RoomOut[] | Room page |
| POST | `/api/rooms/{room_id}/photo` | multipart: file (image) | RoomOut | Room page |
| GET | `/api/rooms/{room_id}/sheet` | - | HTML page | Room page (opens in new tab) |
| GET | `/api/properties/{id}/rooms` | - | RoomOut[] | Property page |
| POST | `/api/rooms/{room_id}/baseline/photo` | multipart: file (image), priority (high|normal) | BaselineResult | Room page |
| POST | `/api/rooms/{room_id}/baseline/video` | multipart: file (video) | BaselineResult | Room page |
| GET | `/api/rooms/{room_id}/items` | query: status (optional) | ItemOut[] | Room page |
| PATCH | `/api/items/{id}` | JSON ItemPatch | ItemOut | Room page |
| DELETE | `/api/items/{id}` | - | 204 no body | Room page |
| POST | `/api/rooms/{room_id}/items` | JSON ItemCreate | ItemOut | Room page |
| POST | `/api/items/{id}/condition` | multipart: condition, actor, role, note?, file? (photo) | ItemOut | Room page |
| GET | `/api/items/{id}/history` | - | ConditionEventOut[] | Room page |
| POST | `/api/rooms/{room_id}/items/confirm-all` | - | {confirmed: n} | Room page |
| GET | `/api/guest/{token}` | - | GuestProperty | Guest page |
| POST | `/api/guest/{token}/ask` | multipart: file (image) | GuestAnswer | Guest page |
| POST | `/api/properties/{id}/audits` | - | AuditCreated | Property page |
| POST | `/api/audits/{id}/rooms/{room_id}/video` | multipart: file (video) | UploadAck | Audit page |
| POST | `/api/audits/{id}/rooms/{room_id}/frames` | multipart: files (images, repeated) | UploadAck | Audit page (optional) |
| POST | `/api/audits/{id}/run` | - | RunAck (HTTP 202) | Audit page |
| GET | `/api/audits/{id}` | - | AuditDetail | Audit page (poll every 2 s) |
| PATCH | `/api/findings/{id}` | JSON {role (required), resolution?, note?} | FindingOut | Audit page |
| POST | `/api/properties/{id}/inspections` | JSON {kind, inspector, reservation_ref?} | InspectionOut | Property page |
| GET | `/api/properties/{id}/inspections` | - | InspectionOut[] | Property page |
| GET | `/api/inspections/{id}` | - | InspectionDetail | Inspection page |
| PATCH | `/api/inspection-items/{id}` | JSON InspectionItemPatch | InspectionItemOut | Inspection page |
| POST | `/api/inspection-items/{id}/photo` | multipart: file, actor, role | InspectionItemOut | Inspection page |
| PATCH | `/api/cleaning-checks/{id}` | JSON {actor, done} | CleaningCheckOut | Inspection page |
| POST | `/api/inspections/{id}/ai-suggestions` | JSON {audit_id} | {applied: n} | Inspection page |
| POST | `/api/inspections/{id}/complete` | JSON {role, actor, exception_note?} | InspectionOut | Inspection page |
| GET | `/api/inspections/{id}/readiness` | - | ReadinessReport | Readiness page |
| GET | `/api/properties/{id}/discrepancies` | query: status (optional) | DiscrepancyOut[] | Cases page |
| GET | `/api/discrepancies/{id}` | - | DiscrepancyDetail | Case page |
| PATCH | `/api/discrepancies/{id}` | JSON {role, actor, status?, assigned_to?, blocks_readiness?} | DiscrepancyOut | Case page |
| POST | `/api/discrepancies/{id}/events` | multipart: role, actor, kind, text?, file? | DiscrepancyEventOut | Case page |
| POST | `/api/discrepancies/{id}/resolve` | JSON {role, actor, outcome, note?} | DiscrepancyOut | Case page |
| GET | `/media/{path}` | - | image bytes | all pages (img src) |

## Shapes

- `BBox` = { x, y, w, h }  numbers 0..1, relative to the image width and height (top-left origin)
- `RoomOut` = { id, property_id, parent_id|null, name, room_type, path ('Living room > Closet'), reference_photo_url|null, confirmed_items, suggested_items }. A place inside a room has parent_id set
- `PropertyOut` = { id, name, guest_token, created_at, address|null, property_type|null, capacity|null, details|null, rules|null }
- `PropertyDetail` = PropertyOut + { rooms: RoomOut[] (top-level only), latest_audit_id|null, latest_inspection_id|null, open_discrepancies }
- `ItemOut` = { id, room_id, label, category|null, quantity, priority, bbox|null, crop_url|null, source_image_url|null, location_hint|null, notes|null, status 'suggested'|'confirmed'|'retired', location_id|null, location_path|null, kind 'fixed'|'movable'|'shared'|'consumable', condition 'new'|'good'|'worn'|'damaged'|'missing'|'under_repair', availability 'guest'|'staff_only', high_value, min_quantity|null, alternate_locations: string[] }
- `ItemCreate` = { label, quantity? (1..999), kind?, category?, location_id?, location_hint?, notes?, availability?, high_value?, min_quantity?, alternate_locations? }
- `ItemPatch` = any of { label, quantity (1..999), notes, location_hint, status, kind, availability, high_value, min_quantity, alternate_locations, location_id (null = anywhere in the room) }
- `ConditionEventOut` = { id, item_id, condition, previous|null, note|null, photo_url|null, actor, role|null, created_at }
- `BaselineResult` = { capture_id, items: ItemOut[] }  (new items arrive with status 'suggested')
- `GuestProperty` = { property_name, item_labels: string[], house_rules|null }  (staff_only items are never listed)
- `GuestAnswer` = { matched, message, item_label|null, guide: GuestGuide|null }
- `GuestGuide` = { title, steps: string[], warnings: string[], seen, unsure: string[] }
- `AuditCreated` = { id, property_id, status }
- `UploadAck` = { audit_id, room_id, frames }
- `RunAck` = { audit_id, status }
- `FindingOut` = { id, audit_id, item_id|null, room_id|null, item_label, type 'missing'|'misplaced'|'count_mismatch'|'extra'|'unverified', expected|null, observed|null, confidence|null, evidence_frame_url|null, reference_crop_url|null, resolution 'open'|'found'|'confirmed'|'dismissed', resolved_by 'cleaner'|'host'|null, resolved_at|null, note|null }
- `AuditDetail` = { id, property_id, status 'draft'|'running'|'done'|'failed', stage|null, summary|null, rooms_uploaded: room_id[], findings: FindingOut[], created_at }
- `SeedResult` = { property_id, guest_token, room_ids[] }
- `Health` = { status, mock_models }
- `InspectionOut` = { id, property_id, kind 'after_checkout'|'after_cleaning'|'before_checkin', inspector, reservation_ref|null, status 'in_progress'|'completed'|'completed_with_exception', exception_note|null, exception_by|null, created_at, completed_at|null }
- `AiSuggestion` = { type (a finding type), observed|null, confidence|null, evidence_frame_url|null, audit_id }  (a hint, never a result)
- `InspectionItemOut` = { id, inspection_id, room_id, item_id|null, label, kind, high_value, expected_quantity, min_quantity|null, result 'pending'|'ok'|'not_seen'|'misplaced'|'missing'|'damaged'|'low_stock', observed_quantity|null, note|null, photo_url|null, checked_by|null, checked_at|null, reference_crop_url|null, location_path|null, alternate_locations[], ai_suggestion|null, discrepancy_id|null }
- `CleaningCheckOut` = { id, room_id, label, done, done_by|null, done_at|null }
- `RoomInspection` = { room_id, room_name, room_type, cleaning_status, inventory_status ('pending'|'in_progress'|'done'|'not_applicable'), items: InspectionItemOut[], cleaning: CleaningCheckOut[] }
- `InspectionDetail` = InspectionOut + { rooms: RoomInspection[], blockers: string[], can_complete }
- `InspectionItemPatch` = { role, actor, result?, observed_quantity?, note? }
- `ReadinessReport` = { inspection_id, property_name, kind, inspector, reservation_ref|null, status 'ready'|'ready_with_exceptions'|'not_ready', cleaning_status, inventory_status, summary, rooms: [{room_name, cleaning_status, inventory_status, issues[]}], blocking[], open_cases[], known_gaps[], low_stock[], exception_note|null, exception_by|null, generated_at }
- `DiscrepancyOut` = { id, property_id, inspection_id|null, item_id|null, room_id|null, room_name|null, item_label, type 'missing'|'misplaced'|'damaged'|'not_seen', status 'open'|'investigating'|'resolved', assigned_to|null, blocks_readiness, outcome 'found'|'restored_to_place'|'repaired'|'replaced'|'recorded_missing'|null, resolution_note|null, resolved_by|null, resolved_at|null, created_at }
- `DiscrepancyEventOut` = { id, kind 'detected'|'note'|'search'|'evidence'|'assigned'|'status'|'resolved', text|null, photo_url|null, actor, role|null, created_at }
- `DiscrepancyDetail` = DiscrepancyOut + { events: DiscrepancyEventOut[], reference_crop_url|null, expected_location|null, ai_suggestion|null }

## Mock mode (frontend can build without model keys)

- MOCK_MODELS=true is the default. No keys needed. Answers are fake but consistent, so every screen can be built.
- POST /api/dev/seed creates 'Demo loft (seeded)' with a Living room, a Kitchen and a Bathroom, nested places (Living room > Glass cabinet > Top shelf, Kitchen > Upper cupboard > Left shelf, Under-sink cupboard), a mix of item kinds (movable, fixed, consumable), high-value items, items with an alternate place, and one suggested item to review. It also stores house rules.
- Seeded AI video check behaviours (5 findings): 'Black Roku remote' is missing (searched in the other room too, still missing), 'Samsung TV remote' is misplaced (seen on the sofa, usually on the coffee table), 'Bottle opener' is misplaced (kitchen item found in the Living room), 'Wine glass set' is count_mismatch (3 of 4), 'Smart speaker' is unverified. The rest pass. The TV remote's alternate place is 'TV console', not 'sofa', so it stays misplaced.
- Any item whose notes contain [mock:missing], [mock:unverified], [mock:count=N], [mock:moved=some place] or [mock:otherroom] triggers that outcome in an AI video check, so the frontend can create its own test cases by editing notes. ([mock:otherroom] needs a second room with an uploaded video in the same audit.)
- Inspections need no model: they are human checklists, so the whole inspection, case and readiness flow works the same with or without mock mode.
- Any video works in mock mode, as long as it is a real video file (ffmpeg extracts frames from it).
