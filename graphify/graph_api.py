"""Generate a Mermaid navigation graph mapping frontend API calls to backend routes.

Scans:
- backend/app/main.py          -> /api prefix mount + root-level routers
- backend/app/routers/*.py     -> @router.<method>("<path>") + tags
- frontend/lib/api.ts          -> api.<name> => req<...>("<path>")

Outputs a Mermaid graph (docs/API_GRAPH.mmd) viewable in any Markdown renderer
that supports Mermaid (GitHub, VS Code, Notion, Obsidian, etc.).

Run:  python tools/graph_api.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROUTERS = ROOT / "backend" / "app" / "routers"
BACKEND_MAIN = ROOT / "backend" / "app" / "main.py"
FRONTEND_API = ROOT / "frontend" / "lib" / "api.ts"
OUT = ROOT / "docs" / "API_GRAPH.mmd"

DQ = chr(34)  # "
SQ = chr(39)  # '
QUOTES = DQ + SQ  # "'

_METHOD_RE = re.compile(
    r"@router\.(get|post|put|patch|delete|head|options)\s*\(\s*[" + QUOTES + r"]([^" + QUOTES + r"]+)[" + QUOTES + r"]"
)
_TAGS_RE = re.compile(r"tags\s*=\s*\[\s*[" + QUOTES + r"]([^" + QUOTES + r"]+)[" + QUOTES + r"]\s*\]")
_ROUTER_VAR_RE = re.compile(r"router\s*=\s*APIRouter\(([^)]*)\)")

_QBT = DQ + SQ + chr(96)  # " ' `

_FRONTEND_ENTRY_RE = re.compile(
    r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*.*?=>\s*req<[^>]*>\(\s*[" + _QBT + r"]"
    r"([^" + _QBT + r"]+)[" + _QBT + r"]",
    re.MULTILINE,
)


def collect_backend_routes() -> list[dict]:
    """Return list of {method, path, tag, source} for every backend route."""
    routes: list[dict] = []

    main_text = BACKEND_MAIN.read_text(encoding="utf-8")
    root_router_vars: set[str] = set()
    for m in re.finditer(r'app\.include_router\((\w+)\.router\)', main_text):
        root_router_vars.add(m.group(1))

    for py in sorted(BACKEND_ROUTERS.glob("*.py")):
        text = py.read_text(encoding="utf-8")

        prefix = ""
        pm = _ROUTER_VAR_RE.search(text)
        if pm:
            prefix_m = re.search(r'prefix\s*=\s*["' + QUOTES + r']([^"' + QUOTES + r'"])["' + QUOTES + r']', pm.group(1))
            if prefix_m:
                prefix = prefix_m.group(1)

        tag = "untagged"
        tm = _TAGS_RE.search(text)
        if tm:
            tag = tm.group(1)

        is_root = py.stem in root_router_vars
        base = "" if is_root else "/api"

        for mm in _METHOD_RE.finditer(text):
            method, path = mm.group(1).upper(), mm.group(2)
            routes.append(
                {
                    "method": method,
                    "path": f"{base}{prefix}{path}",
                    "tag": tag,
                    "source": py.name,
                    "root": is_root,
                }
            )

    # main.py also defines /api/health inline (not in a router file).
    for mm in re.finditer(
        r'@api\.(get|post|put|patch|delete)\s*\(\s*["' + QUOTES + r']([^"' + QUOTES + r'"])["' + QUOTES + r']',
        main_text,
    ):
        routes.append(
            {
                "method": mm.group(1).upper(),
                "path": f"/api{mm.group(2)}",
                "tag": "meta",
                "source": "main.py",
                "root": False,
            }
        )

    # De-duplicate identical (method, path).
    seen: set[tuple[str, str]] = set()
    unique: list[dict] = []
    for r in routes:
        key = (r["method"], r["path"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)
    return unique


def collect_frontend_calls() -> list[dict]:
    """Return list of {name, path} for every api.<name> entry in api.ts."""
    text = FRONTEND_API.read_text(encoding="utf-8")
    calls: list[dict] = []
    for m in _FRONTEND_ENTRY_RE.finditer(text):
        calls.append({"name": m.group(1), "path": m.group(2)})
    return calls


_PARAM_RE = re.compile(r"\{[^}]+\}|\$\{[^}]+\}")


def normalize_path(path: str) -> str:
    """Normalize path params so {property_id} and ${id} both become :param."""
    return _PARAM_RE.sub(":param", path)


def escape(label: str) -> str:
    """Make a Mermaid-safe node id."""
    return label.replace(DQ, "\\" + DQ).replace("/", "_").replace("{", "").replace("}", "").replace("-", "_")


def build_mermaid(backend: list[dict], frontend: list[dict]) -> str:
    lines: list[str] = []
    lines.append("graph LR")
    lines.append("    classDef backend fill:#e1f5fe,stroke:#01579b,stroke-width:2px;")
    lines.append("    classDef frontend fill:#fff3e0,stroke:#e65100,stroke-width:2px;")
    lines.append("    classDef prefix fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;")
    lines.append("")

    lines.append("    %% Frontend API entry points")
    for c in frontend:
        lines.append(f'    F_{escape(c["name"])}["{c["name"]}"]:::frontend')
    lines.append("")

    lines.append("    %% Backend routes (unique id per method + path)")
    for r in backend:
        node_id = f'B_{r["method"]}_{escape(r["path"])}'
        lines.append(f'    {node_id}["{r["method"]} {r["path"]}"]:::backend')
    lines.append("")

    lines.append("    %% Prefix mounts")
    lines.append('    API_PREFIX["/api"]:::prefix')
    lines.append('    ROOT["(root)"]:::prefix')
    lines.append("")

    # Index frontend calls by normalized path.
    frontend_by_norm: dict[str, list[str]] = {}
    for c in frontend:
        frontend_by_norm.setdefault(normalize_path(c["path"]), []).append(c["name"])

    wired_backend: set[str] = set()
    for r in backend:
        node_id = f'B_{r["method"]}_{escape(r["path"])}'
        path = r["path"]
        if path.startswith("/api"):
            stripped = normalize_path(path[len("/api"):])
            callers = frontend_by_norm.get(stripped, [])
            if callers:
                wired_backend.add(node_id)
                for caller in callers:
                    lines.append(f'    F_{escape(caller)} -->|req()| {node_id}')
        else:
            # Root-level routes (meta router): not called by frontend directly
            lines.append(f'    ROOT -->|direct| {node_id}')

    # Backend routes with no frontend caller: show them mounted under /api
    for r in backend:
        node_id = f'B_{r["method"]}_{escape(r["path"])}'
        if node_id in wired_backend:
            continue
        path = r["path"]
        if path.startswith("/api"):
            lines.append(f'    API_PREFIX -->|mounts| {node_id}')

    return "\n".join(lines) + "\n"


def main() -> None:
    backend = collect_backend_routes()
    frontend = collect_frontend_calls()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    mmd = build_mermaid(backend, frontend)
    OUT.write_text(mmd, encoding="utf-8")

    print(f"Backend routes found: {len(backend)}")
    print(f"Frontend API calls found: {len(frontend)}")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
