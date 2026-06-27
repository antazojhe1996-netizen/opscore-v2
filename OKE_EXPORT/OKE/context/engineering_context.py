from dataclasses import dataclass

from OKE.context.database_context import DatabaseContext


@dataclass
class EngineeringContext:
    task: str
    database: DatabaseContext | None = None