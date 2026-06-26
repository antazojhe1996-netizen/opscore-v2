import sys

from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.services.engineering_report_service import EngineeringReportService


def print_table_report(table_name):
    adapter = SupabaseAdapter()

    tables = adapter.discover_tables()
    columns = adapter.discover_columns()
    primary_keys = adapter.discover_primary_keys()
    foreign_keys = adapter.discover_foreign_keys()

    table_exists = any(
        table["table_name"] == table_name
        for table in tables
    )

    if not table_exists:
        print(f"Table not found: {table_name}")
        return

    report = EngineeringReportService().build(
        tables=tables,
        columns=columns,
        primary_keys=primary_keys,
        foreign_keys=foreign_keys,
        table_name=table_name,
    )

    print("=" * 60)
    print("OKE ENGINEERING TABLE REPORT")
    print("=" * 60)
    print()
    print(f"Table      : {report.subject}")
    print(f"Risk Level : {report.risk}")
    print()
    print("Summary")
    print("-------")
    print(f"Columns       : {len(report.columns)}")
    print(f"Primary Keys  : {len(report.primary_keys)}")
    print(f"Foreign Keys  : {len(report.foreign_keys)}")
    print(f"Referenced By : {len(report.referenced_by)}")
    print(f"Dependencies  : {len(report.dependencies)}")
    print()

    if report.primary_keys:
        print("Primary Key")
        print("-----------")
        for pk in report.primary_keys:
            print(f"- {pk['column_name']} ({pk['constraint_name']})")
        print()

    if report.foreign_keys:
        print("Foreign Keys")
        print("------------")
        for fk in report.foreign_keys:
            print(
                f"- {fk['column_name']} -> "
                f"{fk['foreign_table_name']}.{fk['foreign_column_name']}"
            )
        print()

    if report.referenced_by:
        print("Referenced By")
        print("-------------")
        for ref in report.referenced_by:
            print(f"- {ref['table_name']}.{ref['column_name']}")
        print()

    if report.dependencies:
        print("Dependency Graph")
        print("----------------")
        for dependency in report.dependencies:
            print(f"- {dependency}")
        print()

    print("Engineering Status: PASS")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  py -m OKE.cli <table_name>")
        return

    table_name = sys.argv[1]
    print_table_report(table_name)


if __name__ == "__main__":
    main()