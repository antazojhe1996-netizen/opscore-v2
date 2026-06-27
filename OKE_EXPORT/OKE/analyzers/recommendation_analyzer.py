from dataclasses import dataclass


@dataclass
class EngineeringRecommendation:
    message: str


class RecommendationAnalyzer:

    def analyze(self, report, impact, module_impact, regression_plan):

        if impact.risk in ["CRITICAL", "HIGH"]:
            return EngineeringRecommendation(
                message=(
                    "High impact change detected. "
                    "Run the full regression checklist before deployment."
                )
            )

        if regression_plan.checklist:
            return EngineeringRecommendation(
                message=(
                    "Moderate impact change. "
                    "Run the listed regression checks before deployment."
                )
            )

        return EngineeringRecommendation(
            message="Low impact change. Basic smoke test is enough."
        )