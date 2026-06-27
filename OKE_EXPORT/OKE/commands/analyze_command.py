from OKE.adapters.supabase_adapter import SupabaseAdapter
from OKE.commands.base_command import BaseCommand
from OKE.context import DatabaseContext, EngineeringContext
from OKE.coordinator.coordinator import Coordinator
from OKE.orchestrator.orchestrator import Orchestrator
from OKE.workspace import WorkspaceManager


class AnalyzeCommand(BaseCommand):

    name = "analyze"

    def execute(self, args):

        if len(args) < 1:
            print("Usage:")
            print("py -m OKE analyze <table_name>")
            return

        table_name = args[0]

        adapter = SupabaseAdapter()

        context = EngineeringContext(
            task=f"analyze {table_name} table",
            database=DatabaseContext(
                tables=adapter.discover_tables(),
                columns=adapter.discover_columns(),
                primary_keys=adapter.discover_primary_keys(),
                foreign_keys=adapter.discover_foreign_keys(),
                table_name=table_name,
            ),
        )

        result = Orchestrator().execute(
            Coordinator(),
            task=context.task,
            context=context,
        )

        database_result = result.specialist_results.get("database")

        if not database_result:
            print("No database result.")
            return

        report = database_result["report"]
        impact = database_result["impact"]
        modules = database_result["modules"]
        regression = database_result["regression"]
        recommendation = database_result["recommendation"]

        report_data = {
            "task": context.task,
            "table": report.subject,
            "risk": report.risk,
            "metrics": {
                "columns": report.metrics.column_count,
                "primary_keys": report.metrics.primary_key_count,
                "foreign_keys": report.metrics.foreign_key_count,
                "referenced_by": report.metrics.referenced_by_count,
                "dependencies": report.metrics.dependency_count,
            },
            "impact": {
                "affected_tables": impact.affected_tables,
                "affected_table_count": len(impact.affected_tables),
                "affected_modules": modules.modules,
                "affected_module_count": len(modules.modules),
            },
            "regression": {
                "checklist": regression.checklist,
                "check_count": len(regression.checklist),
            },
            "recommendation": recommendation.message,
        }

        saved_path = WorkspaceManager().save_report(
            table_name,
            report_data,
        )

        print("=" * 60)
        print("OKE ANALYZE REPORT")
        print("=" * 60)
        print()
        print(f"Task : {context.task}")
        print(f"Plan : {result.plan.required_specialists}")
        print()
        print(f"Table      : {report.subject}")
        print(f"Risk Level : {report.risk}")
        print()
        print(f"Affected Tables   : {len(impact.affected_tables)}")
        print(f"Affected Modules  : {len(modules.modules)}")
        print(f"Regression Checks : {len(regression.checklist)}")
        print()
        print("Recommendation")
        print("--------------")
        print(recommendation.message)
        print()
        print("Workspace")
        print("---------")
        print(f"Saved Report : {saved_path}")