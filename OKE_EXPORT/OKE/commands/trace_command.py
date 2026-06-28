from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.parsers.sourcebook_parser import SourceBookParser


class TraceCommand(BaseCommand):
    name = "trace"

    def execute(self, args):
        if len(args) < 1:
            print("Usage: py -m OKE trace <keyword>")
            return

        keyword = args[0]
        parser = SourceBookParser()

        if not parser.exists():
            print("OPSCORE_SOURCE_BOOK.md not found.")
            return

        matches = parser.search(keyword)
        grouped = parser.group_matches(matches)

        report = {
            "keyword": keyword,
            "source_book": str(parser.source_book),
            "match_count": len(matches),
            "grouped": grouped,
            "matches": matches,
        }

        saved_path = WorkspaceManager().save_report(f"trace_{keyword}", report)

        print("=" * 60)
        print("OKE TRACE REPORT")
        print("=" * 60)
        print()
        print(f"Keyword     : {keyword}")
        print(f"Matches     : {len(matches)}")
        print(f"Source Book : {parser.source_book}")
        print()

        for area, items in sorted(grouped.items()):
            unique_files = sorted(set(item["file"] for item in items))
            print(f"{area}: {len(items)} matches / {len(unique_files)} files")

        print()
        print("Saved Report")
        print("------------")
        print(saved_path)