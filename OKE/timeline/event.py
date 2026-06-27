from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class EngineeringEvent:

    timestamp: datetime

    event_type: str

    message: str

    data: Any = None