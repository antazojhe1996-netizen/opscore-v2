from pathlib import Path
import shutil


class ExportPackager:

    def __init__(self):

        self.project_root = Path.cwd()
        self.output_dir = self.project_root / "OKE_EXPORT"

    def reset(self):

        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)

        self.output_dir.mkdir(parents=True, exist_ok=True)

    def package_files(self, files):

        for file in files:
            relative = file.relative_to(self.project_root)
            destination = self.output_dir / relative

            destination.parent.mkdir(parents=True, exist_ok=True)

            shutil.copy2(file, destination)

        return self.output_dir