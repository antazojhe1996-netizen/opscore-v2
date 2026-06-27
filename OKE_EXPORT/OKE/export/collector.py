from pathlib import Path


class ExportCollector:

    def __init__(self):

        self.project_root = Path.cwd()
        self.oke_root = self.project_root / "OKE"

    def collect_files(self):

        files = []

        for path in self.oke_root.rglob("*"):
            if not path.is_file():
                continue

            if "__pycache__" in path.parts:
                continue

            if path.suffix == ".pyc":
                continue

            files.append(path)

        return sorted(files)