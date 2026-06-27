from dataclasses import dataclass


@dataclass
class EngineeringMetrics:
    column_count: int
    primary_key_count: int
    foreign_key_count: int
    referenced_by_count: int
    dependency_count: int