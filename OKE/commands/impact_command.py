from OKE.commands.base_command import BaseCommand
from OKE.workspace import WorkspaceManager
from OKE.adapters.supabase_adapter import SupabaseAdapter


class ImpactCommand(BaseCommand):
    name = "impact"

    def execute(self, args):
        if len(args) < 1:
            print("Usage: py -m OKE impact <table_name>")
            return

        table_name = args[0]
        adapter = SupabaseAdapter()
        foreign_keys = adapter.discover_foreign_keys()

        depends_on = []
        referenced_by = []

        for fk in foreign_keys:
            if fk["table_name"] == table_name:
                depends_on.append(fk)
            if fk["foreign_table_name"] == table_name:
                referenced_by.append(fk)

        risk = "LOW"
        total = len(depends_on) + len(referenced_by)

        if total >= 8:
            risk = "HIGH"
        elif total >= 3:
            risk = "MEDIUM"

        report = {
            "table": table_name,
            "risk": risk,
            "depends_on": depends_on,
            "referenced_by": referenced_by,
            "regression_checklist": [
                "Check UI pages that read/write this table",
                "Check API routes that insert/update/delete this table",
                "Check engines/services that compute values from this table",
                "Check reports/dashboard totals",
                "Check multi-company company_id filtering",
                "Check foreign key and orphan records",
            ],
        }

        saved_path = WorkspaceManager().save_report(f"impact_{table_name}", report)

        print("=" * 60)
        print("OKE IMPACT REPORT")
        print("=" * 60)
        print()
        print(f"Table : {table_name}")
        print(f"Risk  : {risk}")
        print(f"Relations : {total}")
        print()
        print("Saved Report")
        print("------------")
        print(saved_path)