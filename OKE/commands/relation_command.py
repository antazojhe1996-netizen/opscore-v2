from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager


class RelationCommand(BaseCommand):

    name = "relation"

    def execute(self, args):

        if len(args) < 1:
            print("Usage:")
            print("py -m OKE relation <table_name>")
            return

        table_name = args[0]

        adapter = SupabaseAdapter()

        foreign_keys = adapter.discover_foreign_keys()

        outgoing = []
        incoming = []

        for fk in foreign_keys:
            child_table = fk["table_name"]
            parent_table = fk["foreign_table_name"]

            if child_table == table_name:
                outgoing.append(fk)

            if parent_table == table_name:
                incoming.append(fk)

        report = {
            "table": table_name,
            "outgoing_foreign_keys": outgoing,
            "incoming_references": incoming,
            "summary": {
                "depends_on_count": len(outgoing),
                "referenced_by_count": len(incoming),
            },
        }

        saved_path = WorkspaceManager().save_report(
            f"relation_{table_name}",
            report,
        )

        print("=" * 60)
        print("OKE RELATION REPORT")
        print("=" * 60)
        print()
        print(f"Table : {table_name}")
        print()
        print(f"Depends On    : {len(outgoing)}")
        print(f"Referenced By : {len(incoming)}")
        print()
        print("Saved Report")
        print("------------")
        print(saved_path)