from dataclasses import dataclass, field
from typing import Any

from OKE.models.engineering_metrics import EngineeringMetrics


@dataclass
class EngineeringReport:
    subject: str
    risk: str
    metrics: EngineeringMetrics

    columns: list[dict[str, Any]] = field(default_factory=list)
    primary_keys: list[dict[str, Any]] = field(default_factory=list)
    foreign_keys: list[dict[str, Any]] = field(default_factory=list)
    referenced_by: list[dict[str, Any]] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)