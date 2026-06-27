from dataclasses import dataclass

from OKE.aggregators.result_aggregator import ResultAggregator
from OKE.commander.commander import Commander


@dataclass
class CoordinationPlan:
    task: str
    required_specialists: list[str]


class Coordinator:

    def plan(self, task):

        required_specialists = []

        task_lower = task.lower()

        if (
            "database" in task_lower
            or "table" in task_lower
            or "schema" in task_lower
        ):
            required_specialists.append("database")

        return CoordinationPlan(
            task=task,
            required_specialists=required_specialists,
        )

    def execute(self, task, action="analyze", **kwargs):

        plan = self.plan(task)
        commander = Commander()

        specialist_results = {}

        for specialist_name in plan.required_specialists:
            specialist_results[specialist_name] = commander.dispatch(
                specialist_name=specialist_name,
                action=action,
                **kwargs,
            )

        aggregated = ResultAggregator().aggregate(
            specialist_results
        )

        return {
            "plan": plan,
            "aggregated": aggregated,
        }