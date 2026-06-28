from pathlib import Path
import shutil


class SpecialistGenerator:

    def __init__(self):

        self.root = Path(__file__).resolve().parents[1]

        self.template = self.root / "templates" / "specialist"

        self.output = self.root / "specialists"

    def create(self, name):

        name = name.lower()

        destination = self.output / name

        if destination.exists():
            raise FileExistsError(
                f"Specialist '{name}' already exists."
            )

        shutil.copytree(
            self.template,
            destination,
        )

        return destination