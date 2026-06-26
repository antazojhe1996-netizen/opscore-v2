import os

from dotenv import load_dotenv
from supabase import create_client

from OKE.adapters.database_adapter import DatabaseAdapter


class SupabaseAdapter(DatabaseAdapter):
    def __init__(self):
        load_dotenv(".env.local")

        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url:
            raise RuntimeError("SUPABASE_URL missing")

        if not key:
            raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY missing")

        self.client = create_client(url, key)

    def load(self):
        raise NotImplementedError("Supabase schema load not implemented yet")

    def discover_tables(self):
        response = self.client.rpc("oke_discover_tables").execute()
        return response.data

    def discover_columns(self):
        response = self.client.rpc("oke_discover_columns").execute()
        return response.data

    def discover_primary_keys(self):
        response = self.client.rpc("oke_discover_primary_keys").execute()
        return response.data