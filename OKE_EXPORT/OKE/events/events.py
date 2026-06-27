from dataclasses import dataclass, field


@dataclass
class Event:

    name: str
    payload: dict = field(default_factory=dict)


@dataclass
class EngineeringStarted(Event):

    def __init__(self, task):
        super().__init__(
            name="engineering.started",
            payload={
                "task": task,
            },
        )


@dataclass
class EngineeringFinished(Event):

    def __init__(self, task, status="PASS"):
        super().__init__(
            name="engineering.finished",
            payload={
                "task": task,
                "status": status,
            },
        )


@dataclass
class SpecialistStarted(Event):

    def __init__(self, specialist):
        super().__init__(
            name="specialist.started",
            payload={
                "specialist": specialist,
            },
        )


@dataclass
class SpecialistFinished(Event):

    def __init__(self, specialist, status="PASS"):
        super().__init__(
            name="specialist.finished",
            payload={
                "specialist": specialist,
                "status": status,
            },
        )