from abc import ABC, abstractmethod


class BaseCommand(ABC):

    name = "base"

    _registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        if getattr(cls, "name", None) and cls.name != "base":
            BaseCommand._registry[cls.name] = cls

    @classmethod
    def registry(cls):
        return dict(cls._registry)

    @abstractmethod
    def execute(self, args):
        raise NotImplementedError