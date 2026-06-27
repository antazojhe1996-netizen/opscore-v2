from pathlib import Path
import json


class WorkspaceRepository:

    def __init__(self):

        self.root = Path(__file__).resolve().parent

    def read_json(self, folder, name):

        path = self.root / folder / f"{name}.json"

        if not path.exists():
            return None

        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

    def write_json(
        self,
        folder,
        name,
        data,
    ):

        directory = self.root / folder

        directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        path = directory / f"{name}.json"

        path.write_text(
            json.dumps(
                data,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )

        return path

    def exists(
        self,
        folder,
        name,
    ):

        return (
            self.root / folder / f"{name}.json"
        ).exists()