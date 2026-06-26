from datetime import datetime

from OKE.adapters.dummy_adapter import DummyAdapter
from OKE.adapters.supabase_adapter import SupabaseAdapter
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

    def run_dummy_pipeline(self):
        print()
        print("[Database Specialist - Dummy]")

        adapter = DummyAdapter()
        extractor = DatabaseExtractor(adapter)
        schema = extractor.extract()

        print(f"Tables  : {schema.total_tables}")
        print(f"Columns : {schema.total_columns}")
        print("Status  : PASS")

    def run_database_discovery(self):
        print()
        print("[Database Discovery]")

        adapter = SupabaseAdapter()
        tables = adapter.discover_tables()

        for table in tables[:20]:
            print(f'{table["table_schema"]}.{table["table_name"]}')

        print()
        print(f"Tables Found : {len(tables)}")
        print("Status       : PASS")

    def run(self):
        self.banner()

        self.run_dummy_pipeline()
        self.run_database_discovery()

        print()
        print("Engineering Status : PASS")


if __name__ == "__main__":
    Orchestrator().run()