from pathlib import Path


class FileLocator:

    def __init__(self):

        self.project_root = Path.cwd()

    def latest(self, folder, prefix, extension=".md"):

        directory = self.project_root / folder

        if not directory.exists():
            return None

        latest_file = directory / f"{prefix}_LATEST{extension}"

        if latest_file.exists():
            return latest_file

        candidates = [
            path for path in directory.glob(f"{prefix}_*{extension}")
            if path.is_file()
        ]

        if not candidates:
            return None

        return max(
            candidates,
            key=lambda path: path.stat().st_mtime,
        )