from dataclasses import dataclass

from OKE.knowledge.regression_map import REGRESSION_MAP


@dataclass
class RegressionPlan:
    checklist: list[str]


class RegressionAnalyzer:

    def analyze(self, module_impact):

        checklist = set()

        for module in module_impact.modules:
            checklist.update(
                REGRESSION_MAP.get(module, [])
            )

        return RegressionPlan(
            checklist=sorted(checklist)
        )