from pathlib import Path
from dataclasses import dataclass


@dataclass
class CollectionResult:
    source_files: list
    excluded_files: list
    missing_files: list

    @property
    def passed(self):
        return len(self.missing_files) == 0


class ExportCollector:

    def __init__(self):

        self.project_root = Path.cwd()

        self.allowed_extensions = {
            ".py",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".json",
            ".md",
            ".sql",
            ".css",
            ".mjs",
            ".cjs",
        }

        self.excluded_folders = {
            "__pycache__",
            ".git",
            ".next",
            "node_modules",
        }

        self.excluded_extensions = {
            ".pyc",
        }

    def should_exclude(self, path):

        if any(part in self.excluded_folders for part in path.parts):
            return True

        if path.suffix in self.excluded_extensions:
            return True

        return False

    def is_source_file(self, path):

        return path.is_file() and path.suffix in self.allowed_extensions

    def collect(self):

        source_files = []
        excluded_files = []

        for path in self.project_root.rglob("*"):

            if not path.is_file():
                continue

            if self.should_exclude(path):
                excluded_files.append(path)
                continue

            if self.is_source_file(path):
                source_files.append(path)

        # Since collect() scans directly from filesystem,
        # missing_files should only be populated by future package validation.
        missing_files = []

        return CollectionResult(
            source_files=sorted(source_files),
            excluded_files=sorted(excluded_files),
            missing_files=missing_files,
        )