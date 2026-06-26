from abc import ABC, abstractmethod

from OKE.models.database_schema import DatabaseSchema


class DatabaseAdapter(ABC):
    """
    Base class for every database adapter.

    Every adapter MUST return a DatabaseSchema.
    """

    @abstractmethod
    def load(self) -> DatabaseSchema:
        """
        Load database metadata and return a DatabaseSchema.
        """
        raise NotImplementedError()