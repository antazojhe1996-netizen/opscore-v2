from pathlib import Path
import json
from datetime import datetime


class SnapshotManager:

    def __init__(self):

        self.root = Path(__file__).resolve().parent
        self.snapshots = self.root / "snapshots"

        self.snapshots.mkdir(
            parents=True,
            exist_ok=True,
        )

    def save_snapshot(
        self,
        name,
        data,
    ):

        path = self.snapshots / f"{name}.json"

        payload = {
            "name": name,
            "captured_at": datetime.now().isoformat(),
            "snapshot": data,
        }

        path.write_text(
            json.dumps(
                payload,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        return path

    def load_snapshot(
        self,
        name,
    ):

        path = self.snapshots / f"{name}.json"

        if not path.exists():
            return None

        return json.loads(
            path.read_text(
                encoding="utf-8",
            )
        )

    def exists(
        self,
        name,
    ):

        return (
            self.snapshots / f"{name}.json"
        ).exists()