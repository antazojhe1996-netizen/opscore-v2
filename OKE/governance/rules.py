from abc import ABC, abstractmethod


class BaseGovernanceRule(ABC):

    name = "base"
    category = "General"

    @abstractmethod
    def validate(self):
        raise NotImplementedError