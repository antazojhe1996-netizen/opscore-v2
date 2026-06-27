from pathlib import Path
import shutil


class CopyManager:

    def __init__(self):

        self.project_root = Path.cwd()
        self.output_dir = self.project_root / "OKE_EXPORT"

        self.copy_targets = [
            {
                "source": self.output_dir / "OPSCORE_SOURCE_BOOK.md",
                "destination": self.output_dir / "OPSCORE_SOURCE_BOOK.md",
                "required": True,
            },
            {
                "source": self.project_root / "docs" / "database-books" / "OPSCORE_DATABASE_BOOK.md",
                "destination": self.output_dir / "OPSCORE_DATABASE_BOOK.md",
                "required": False,
            },

            # OKE Knowledge Layer
            {
                "source": self.project_root / "OKE" / "docs" / "START_HERE.md",
                "destination": self.output_dir / "START_HERE.md",
                "required": True,
            },
            {
                "source": self.project_root / "OKE" / "docs" / "COMPASS.md",
                "destination": self.output_dir / "COMPASS.md",
                "required": True,
            },
            {
                "source": self.project_root / "OKE" / "docs" / "CURRENT_MISSION.md",
                "destination": self.output_dir / "CURRENT_MISSION.md",
                "required": True,
            },
            {
                "source": self.project_root / "OKE" / "docs" / "PROJECT_HISTORY.md",
                "destination": self.output_dir / "PROJECT_HISTORY.md",
                "required": True,
            },

            # Future optional books
            {
                "source": self.project_root / "docs" / "relation-books" / "OPSCORE_RELATION_BOOK.md",
                "destination": self.output_dir / "OPSCORE_RELATION_BOOK.md",
                "required": False,
            },
            {
                "source": self.project_root / "docs" / "architecture-books" / "OPSCORE_ARCHITECTURE_BOOK.md",
                "destination": self.output_dir / "OPSCORE_ARCHITECTURE_BOOK.md",
                "required": False,
            },
        ]

    def copy(self):

        self.output_dir.mkdir(parents=True, exist_ok=True)

        copied = []
        skipped = []
        missing = []

        for item in self.copy_targets:

            source = item["source"]
            destination = item["destination"]

            if not source.exists():
                missing.append({
                    "source": str(source),
                    "required": item["required"],
                })
                continue

            if source.resolve() == destination.resolve():
                skipped.append({
                    "source": str(source),
                    "reason": "source and destination are the same",
                })
                continue

            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

            copied.append({
                "source": str(source),
                "destination": str(destination),
            })

        required_missing = [
            item for item in missing
            if item["required"]
        ]

        return {
            "copied": copied,
            "skipped": skipped,
            "missing": missing,
            "passed": len(required_missing) == 0,
        }