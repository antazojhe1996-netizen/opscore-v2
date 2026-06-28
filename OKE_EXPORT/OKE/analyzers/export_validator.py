import json
from pathlib import Path


class ExportValidator:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())
        self.export_dir = self.root / "OKE_EXPORT"

    def validate(self):
        sections = {
            "core_package": self.check_files([
                "README.md",
                "manifest.json",
                "PROJECT_SUMMARY.md",
                "AI_CONTEXT.md",
                "ENGINEERING_STATUS.md",
            ]),
            "engineering_docs": self.check_files([
                "00_START_HERE.md",
                "01_ENGINEERING_CONSTITUTION.md",
                "02_CURRENT_PROJECT_STATE.md",
                "03_OKE_COMMAND_REFERENCE.md",
                "04_ENGINEERING_WORKFLOW.md",
                "05_RECOVERY_GUIDE.md",
                "06_ARCHITECTURE.md",
                "07_KNOWLEDGE_BASE.md",
                "08_NEXT_ROADMAP.md",
                "09_CHAT_BOOTSTRAP_PROMPT.md",
                "10_OKE_AUDIT_SUMMARY.md",
                "11_OKE_ARCHITECTURE_BOOK.md",
                "12_OKE_COMMAND_PLAYBOOK.md",
                "13_OKE_TRANSITION_GUIDE.md",
            ]),
            "knowledge_books": self.check_files([
                "OPSCORE_SOURCE_BOOK.md",
                "OPSCORE_DATABASE_BOOK.md",
            ]),
            "manifest": self.check_manifest(),
            "oke_source": self.check_paths([
                "OKE",
                "OKE/commands",
                "OKE/registry",
                "OKE/analyzers",
                "OKE/specialists",
                "OKE/knowledge",
                "OKE/parsers",
                "OKE/export",
                "OKE/workspace",
            ]),
            "reports": self.check_paths([
                "reports",
            ]),
            "zip_files": self.check_any_zip(),
        }

        score = round(
            sum(section["score"] for section in sections.values()) / len(sections),
            2,
        )

        missing = []
        for section_name, section in sections.items():
            for item in section.get("missing", []):
                missing.append({
                    "section": section_name,
                    "item": item,
                })

        status = "READY FOR NEW CHAT" if score == 100 and not missing else "NEEDS REVIEW"

        return {
            "score": score,
            "status": status,
            "sections": sections,
            "missing": missing,
        }

    def check_files(self, files):
        items = []

        for relative_path in files:
            path = self.export_dir / relative_path
            items.append({
                "path": relative_path,
                "exists": path.exists() and path.is_file(),
                "size": path.stat().st_size if path.exists() else 0,
            })

        return self.result(items)

    def check_paths(self, paths):
        items = []

        for relative_path in paths:
            path = self.export_dir / relative_path
            items.append({
                "path": relative_path,
                "exists": path.exists(),
                "size": path.stat().st_size if path.exists() and path.is_file() else 0,
            })

        return self.result(items)

    def check_manifest(self):
        path = self.export_dir / "manifest.json"

        required_keys = [
            "project",
            "generated_at",
            "status",
            "counts",
            "inventory",
        ]

        if not path.exists():
            return {
                "score": 0,
                "status": "FAIL",
                "passed": 0,
                "total": len(required_keys),
                "missing": ["manifest.json"],
                "items": [],
            }

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {
                "score": 0,
                "status": "FAIL",
                "passed": 0,
                "total": len(required_keys),
                "missing": ["manifest.json invalid json"],
                "items": [],
            }

        items = []

        for key in required_keys:
            items.append({
                "path": key,
                "exists": key in data,
                "size": 1 if key in data else 0,
            })

        return self.result(items)

    def check_any_zip(self):
        zip_files = list(self.export_dir.glob("*.zip"))

        items = [{
            "path": "any .zip file",
            "exists": len(zip_files) > 0,
            "size": sum(path.stat().st_size for path in zip_files),
        }]

        result = self.result(items)
        result["zip_files"] = [str(path) for path in zip_files]
        return result

    def result(self, items):
        total = len(items)
        passed = len([item for item in items if item["exists"]])

        score = round((passed / total) * 100, 2) if total else 0

        return {
            "score": score,
            "status": "PASS" if score == 100 else "FAIL",
            "passed": passed,
            "total": total,
            "missing": [
                item["path"]
                for item in items
                if not item["exists"]
            ],
            "items": items,
        }