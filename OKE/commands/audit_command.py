from pathlib import Path
from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager


class AuditCommand(BaseCommand):
    name = "audit"

    def execute(self, args):
        if len(args) < 1:
            print("Usage: py -m OKE audit <module_keyword>")
            return

        module = args[0]
        root = Path.cwd()
        source_book = root / "OKE_EXPORT" / "OPSCORE_SOURCE_BOOK.md"

        if not source_book.exists():
            print("OPSCORE_SOURCE_BOOK.md not found in OKE_EXPORT.")
            return

        text = source_book.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()

        findings = {
            "direct_supabase_usage": [],
            "hardcoded_business_terms": [],
            "large_file_signals": [],
            "todo_fixme": [],
        }

        business_terms = [
            "Vincent",
            "Restaurant Sales",
            "Room Sales",
            "Cash Advance",
            "GCash",
            "Owner Abono",
            "Pool Bar",
            "e68414f1",
        ]

        current_file = None

        for line_no, line in enumerate(lines, start=1):
            if line.startswith("## .\\") or line.startswith("## ./"):
                current_file = line.replace("## ", "").strip()

            if module.lower() not in (current_file or "").lower() and module.lower() not in line.lower():
                continue

            lower = line.lower()

            if "supabase.from" in lower or ".from(" in lower:
                findings["direct_supabase_usage"].append(self.item(current_file, line_no, line))

            for term in business_terms:
                if term.lower() in lower:
                    findings["hardcoded_business_terms"].append(self.item(current_file, line_no, line))

            if "todo" in lower or "fixme" in lower:
                findings["todo_fixme"].append(self.item(current_file, line_no, line))

        score = {
            "architecture": self.score(len(findings["direct_supabase_usage"])),
            "maintainability": self.score(len(findings["hardcoded_business_terms"])),
            "consistency": self.score(len(findings["todo_fixme"])),
            "documentation": 6,
            "technical_debt": "HIGH" if len(findings["direct_supabase_usage"]) > 20 else "MEDIUM",
        }

        report = {
            "module": module,
            "score": score,
            "findings": findings,
        }

        saved_path = WorkspaceManager().save_report(f"audit_{module}", report)

        print("=" * 60)
        print("OKE AUDIT REPORT")
        print("=" * 60)
        print()
        print(f"Module : {module}")
        print()
        print(f"Direct Supabase Usage : {len(findings['direct_supabase_usage'])}")
        print(f"Hardcoded Terms       : {len(findings['hardcoded_business_terms'])}")
        print(f"TODO/FIXME            : {len(findings['todo_fixme'])}")
        print()
        print("Score")
        print("-----")
        for key, value in score.items():
            print(f"{key}: {value}")
        print()
        print("Saved Report")
        print("------------")
        print(saved_path)

    def item(self, file, line, text):
        return {
            "file": file,
            "line": line,
            "text": text.strip(),
        }

    def score(self, count):
        if count == 0:
            return 9
        if count <= 5:
            return 7
        if count <= 15:
            return 5
        return 3