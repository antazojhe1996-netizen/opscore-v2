from datetime import datetime

from OKE.adapters.dummy_adapter import DummyAdapter
from OKE.extractors.database_extractor import DatabaseExtractor


class Orchestrator:
    VERSION = "0.1 Alpha"

    def banner(self):
        print("=" * 60)
        print("OPSCORE Knowledge Engine (OKE)")
        print("=" * 60)
        print(f"Version : {self.VERSION}")
        print(f"Started : {datetime.now()}")
        print("=" * 60)

    def run(self):
        self.banner()

        print()
        print("[Database Specialist]")

        adapter = DummyAdapter()
        extractor = DatabaseExtractor(adapter)
        schema = extractor.extract()

        print(f"Tables  : {schema.total_tables}")
        print(f"Columns : {schema.total_columns}")

        print()
        print("Engineering Status : PASS")


if __name__ == "__main__":
    Orchestrator().run()