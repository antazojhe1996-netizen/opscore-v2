from OKE.analyzers.impact_analyzer import ImpactAnalyzer
from OKE.analyzers.module_analyzer import ModuleAnalyzer
from OKE.analyzers.recommendation_analyzer import RecommendationAnalyzer
from OKE.analyzers.regression_analyzer import RegressionAnalyzer
from OKE.services.engineering_report_service import EngineeringReportService


class EngineeringPipeline:

    def run(
        self,
        tables,
        columns,
        primary_keys,
        foreign_keys,
        table_name,
    ):

        report = EngineeringReportService().build(
            tables=tables,
            columns=columns,
            primary_keys=primary_keys,
            foreign_keys=foreign_keys,
            table_name=table_name,
        )

        impact = ImpactAnalyzer().analyze(report)

        modules = ModuleAnalyzer().analyze(report)

        regression = RegressionAnalyzer().analyze(modules)

        recommendation = RecommendationAnalyzer().analyze(
            report,
            impact,
            modules,
            regression,
        )

        return {
            "report": report,
            "impact": impact,
            "modules": modules,
            "regression": regression,
            "recommendation": recommendation,
        }