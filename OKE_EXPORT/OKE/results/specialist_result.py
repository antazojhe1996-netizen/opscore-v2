from dataclasses import dataclass, field
from typing import Any


@dataclass
class SpecialistResult:
    specialist: str
    status: str

    metrics: dict[str, Any] = field(default_factory=dict)

    duration_ms: float = 0.0