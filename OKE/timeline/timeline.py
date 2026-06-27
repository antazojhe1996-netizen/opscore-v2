from .event import EngineeringEvent


class EngineeringTimeline:

    def __init__(self):

        self.events = []

    def record(self, event: EngineeringEvent):

        self.events.append(event)

    def latest(self):

        if not self.events:
            return None

        return self.events[-1]

    def all(self):

        return list(self.events)