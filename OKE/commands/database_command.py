from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager


class DatabaseCommand(BaseCommand):

    name = "database"

    def execute(self, args):

        if len(args) < 1:
            print("Usage:")
            print("py -m OKE database all")
            return

        mode = args[0]

        if mode != "all":
            print("Unknown database command.")
            print("Usage:")
            print("py -m OKE database all")
            return

        adapter = SupabaseAdapter()

        tables = adapter.discover_tables()
        columns = adapter.discover_columns()
        primary_keys = adapter.discover_primary_keys()
        foreign_keys = adapter.discover_foreign_keys()

        table_names = sorted([
            table["table_name"]
            for table in tables
        ])

        report = {
            "summary": {
                "table_count": len(table_names),
                "column_count": len(columns),
                "primary_key_count": len(primary_keys),
                "foreign_key_count": len(foreign_keys),
            },
            "tables": table_names,
            "columns": columns,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys,
        }

        saved_path = WorkspaceManager().save_report(
            "database_all",
            report,
        )

        print("=" * 60)
        print("OKE DATABASE REPORT")
        print("=" * 60)
        print()
        print(f"Tables       : {len(table_names)}")
        print(f"Columns      : {len(columns)}")
        print(f"Primary Keys : {len(primary_keys)}")
        print(f"Foreign Keys : {len(foreign_keys)}")
        print()
        print("Saved Report")
        print("------------")
        print(saved_path)