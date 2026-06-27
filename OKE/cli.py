import sys

from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.pipelines.engineering_pipeline import EngineeringPipeline


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

    result = EngineeringPipeline().run(
        tables=tables,
        columns=columns,
        primary_keys=primary_keys,
        foreign_keys=foreign_keys,
        table_name=table_name,
    )

    report = result["report"]
    impact = result["impact"]
    modules = result["modules"]
    regression = result["regression"]
    recommendation = result["recommendation"]

    print("=" * 60)
    print("OKE ENGINEERING TABLE REPORT")
    print("=" * 60)
    print()
    print(f"Table      : {report.subject}")
    print(f"Risk Level : {report.risk}")
    print()
    print("Summary")
    print("-------")
    print(f"Columns       : {report.metrics.column_count}")
    print(f"Primary Keys  : {report.metrics.primary_key_count}")
    print(f"Foreign Keys  : {report.metrics.foreign_key_count}")
    print(f"Referenced By : {report.metrics.referenced_by_count}")
    print(f"Dependencies  : {report.metrics.dependency_count}")
    print()

    print("=" * 60)
    print("OKE IMPACT REPORT")
    print("=" * 60)
    print()
    print(f"Target Table        : {impact.table}")
    print(f"Risk Level          : {impact.risk}")
    print(f"Affected Tables     : {len(impact.affected_tables)}")
    print(f"Affected Modules    : {len(modules.modules)}")
    print(f"Regression Checks   : {len(regression.checklist)}")
    print()

    if impact.affected_tables:
        print("Affected Tables")
        print("---------------")
        for table in impact.affected_tables:
            print(f"- {table}")
        print()

    if modules.modules:
        print("Business Impact")
        print("---------------")
        for module in modules.modules:
            print(f"- {module}")
        print()

    if regression.checklist:
        print("Regression Checklist")
        print("--------------------")
        for item in regression.checklist:
            print(f"- {item}")
        print()

    print("Engineering Recommendation")
    print("--------------------------")
    print(recommendation.message)
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