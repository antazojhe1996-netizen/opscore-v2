from OKE.commander.registry import SpecialistRegistry


class Commander:

    def __init__(self):
        self.registry = SpecialistRegistry()

    def dispatch(self, specialist_name, action, **kwargs):

        specialist_class = self.registry.get(specialist_name)
        specialist = specialist_class()

        handler = getattr(specialist, action, None)

        if not handler:
            raise ValueError(
                f"Specialist '{specialist_name}' does not support action: {action}"
            )

        return handler(**kwargs)

    def list_specialists(self):
        return self.registry.list()