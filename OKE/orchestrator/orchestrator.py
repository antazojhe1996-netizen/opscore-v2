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

    def run_supabase_connection_test(self):
        print()
        print("[Supabase Connection Test]")

        adapter = SupabaseAdapter()
        rows = adapter.test_connection()

        print("Connection    : OK")
        print(f"Rows Returned : {len(rows)}")
        print("Status        : PASS")

    def run(self):
        self.banner()

        self.run_dummy_pipeline()
        self.run_supabase_connection_test()

        print()
        print("Engineering Status : PASS")


if __name__ == "__main__":
    Orchestrator().run()