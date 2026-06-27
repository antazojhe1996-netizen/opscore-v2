from dataclasses import dataclass


@dataclass
class DatabaseContext:
    tables: list
    columns: list
    primary_keys: list
    foreign_keys: list
    table_name: str