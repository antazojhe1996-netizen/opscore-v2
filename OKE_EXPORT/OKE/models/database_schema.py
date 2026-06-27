from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DatabaseColumn:
    name: str
    data_type: str
    nullable: bool
    default: Optional[str] = None
    ordinal_position: int = 0


@dataclass
class DatabaseTable:
    schema: str
    name: str
    columns: list[DatabaseColumn] = field(default_factory=list)


@dataclass
class DatabaseSchema:
    tables: list[DatabaseTable] = field(default_factory=list)

    @property
    def total_tables(self):
        return len(self.tables)

    @property
    def total_columns(self):
        return sum(len(t.columns) for t in self.tables)