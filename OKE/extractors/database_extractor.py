from OKE.adapters.database_adapter import DatabaseAdapter
from OKE.models.database_schema import DatabaseSchema


class DatabaseExtractor:

    def __init__(self, adapter: DatabaseAdapter):
        self.adapter = adapter

    def extract(self) -> DatabaseSchema:
        return self.adapter.load()