from abc import ABC, abstractmethod


class Builder(ABC):

    @abstractmethod
    def build(self, *args, **kwargs):
        """Build engineering knowledge."""
        pass