from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.parsers.sourcebook_parser import SourceBookParser


class MapCommand(BaseCommand):
    name = "map"

    def execute(self, args):
        if len(args) < 1:
            print("Usage: py -m OKE map <module_keyword>")
            return

        module = args[0]
        parser = SourceBookParser()

        if not parser.exists():
            print("OPSCORE_SOURCE_BOOK.md not found.")
            return

        files = parser.module_files(module)

        buckets = {
            "UI": [],
            "API": [],
            "ENGINE_OR_SERVICE": [],
            "SHARED_LIB": [],
            "COMPONENT": [],
            "REPORT": [],
            "OKE": [],
            "OTHER": [],
        }

        for file in files:
            area = file["area"]
            buckets.setdefault(area, []).append({
                "file": file["path"],
                "start_line": file["start_line"],
                "end_line": file["end_line"],
                "module": file["module"],
            })

        report = {
            "module": module,
            "source_book": str(parser.source_book),
            "file_count": len(files),
            "flow": ["UI", "API", "ENGINE_OR_SERVICE", "DATABASE", "REPORT"],
            "buckets": buckets,
        }

        saved_path = WorkspaceManager().save_report(f"map_{module}", report)

        print("=" * 60)
        print("OKE MODULE MAP")
        print("=" * 60)
        print()
        print(f"Module      : {module}")
        print(f"Source Book : {parser.source_book}")
        print(f"Files       : {len(files)}")
        print()
        print("UI")
        print("↓")
        print("API")
        print("↓")
        print("ENGINE_OR_SERVICE")
        print("↓")
        print("DATABASE")
        print("↓")
        print("REPORT")
        print()

        for key, items in buckets.items():
            if items:
                print(f"{key}: {len(items)} files")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)