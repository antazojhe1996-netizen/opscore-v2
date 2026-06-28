from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.parsers.sourcebook_parser import SourceBookParser


class SourceCommand(BaseCommand):
    name = "source"

    def execute(self, args):
        if len(args) < 1:
            print("Usage: py -m OKE source <search_text>")
            return

        search_text = args[0]
        parser = SourceBookParser()

        if not parser.exists():
            print("OPSCORE_SOURCE_BOOK.md not found.")
            return

        matches = parser.search(search_text)

        report = {
            "search_text": search_text,
            "source_book": str(parser.source_book),
            "match_count": len(matches),
            "matches": matches,
        }

        saved_path = WorkspaceManager().save_report(
            f"source_{search_text}",
            report,
        )

        print("=" * 60)
        print("OKE SOURCE REPORT")
        print("=" * 60)
        print()
        print(f"Search      : {search_text}")
        print(f"Matches     : {len(matches)}")
        print(f"Source Book : {parser.source_book}")
        print()
        print("Saved Report")
        print("------------")
        print(saved_path)