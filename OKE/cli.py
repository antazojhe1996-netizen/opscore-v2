import sys

from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.analyzers.impact_analyzer import ImpactAnalyzer
from OKE.analyzers.module_analyzer import ModuleAnalyzer
from OKE.analyzers.recommendation_analyzer import RecommendationAnalyzer
from OKE.analyzers.regression_analyzer import RegressionAnalyzer
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

    impact = ImpactAnalyzer().analyze(report)
    module_impact = ModuleAnalyzer().analyze(report)
    regression_plan = RegressionAnalyzer().analyze(module_impact)
    recommendation = RecommendationAnalyzer().analyze(
        report,
        impact,
        module_impact,
        regression_plan,
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
    print(f"Columns       : {report.metrics.column_count}")
    print(f"Primary Keys  : {report.metrics.primary_key_count}")
    print(f"Foreign Keys  : {report.metrics.foreign_key_count}")
    print(f"Referenced By : {report.metrics.referenced_by_count}")
    print(f"Dependencies  : {report.metrics.dependency_count}")
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

    print("=" * 60)
    print("OKE IMPACT REPORT")
    print("=" * 60)
    print()
    print(f"Target Table        : {impact.table}")
    print(f"Risk Level          : {impact.risk}")
    print(f"Affected Tables     : {len(impact.affected_tables)}")
    print(f"Affected Modules    : {len(module_impact.modules)}")
    print(f"Regression Checks   : {len(regression_plan.checklist)}")
    print()

    if impact.affected_tables:
        print("Affected Tables")
        print("---------------")
        for table in impact.affected_tables:
            print(f"- {table}")
        print()

    if module_impact.modules:
        print("Business Impact")
        print("---------------")
        for module in module_impact.modules:
            print(f"- {module}")
        print()

    if regression_plan.checklist:
        print("Regression Checklist")
        print("--------------------")
        for item in regression_plan.checklist:
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