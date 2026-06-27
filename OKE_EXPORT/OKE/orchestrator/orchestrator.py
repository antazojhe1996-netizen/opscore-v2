from dataclasses import dataclass

from OKE.events import (
    EngineeringFinished,
    EngineeringStarted,
    EventBus,
)


@dataclass
class OrchestratorResult:
    plan: object
    specialist_results: dict
    aggregated: object


class Orchestrator:

    def __init__(self, event_bus=None):

        self.event_bus = event_bus or EventBus()

    def execute(
        self,
        coordinator,
        **kwargs,
    ):

        task = kwargs.pop("task")

        self.event_bus.publish(
            EngineeringStarted(task)
        )

        plan = coordinator.plan(task)

        result = coordinator.execute(
            task,
            **kwargs,
        )

        aggregated = result["aggregated"]

        self.event_bus.publish(
            EngineeringFinished(task)
        )

        return OrchestratorResult(
            plan=plan,
            specialist_results=aggregated.results,
            aggregated=aggregated,
        )