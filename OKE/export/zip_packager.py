from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from OKE.export.profiles import ExportProfiles


class ZipPackager:

    def __init__(self):

        self.project_root = Path.cwd()
        self.export_dir = self.project_root / "OKE_EXPORT"

    def package(self, profile="review"):

        export_profile = ExportProfiles.get(profile)

        self.export_dir.mkdir(parents=True, exist_ok=True)

        output_zip = self.export_dir / export_profile["output_zip"]

        files = []
        missing = []

        with ZipFile(output_zip, "w", ZIP_DEFLATED) as archive:

            for artifact in export_profile["artifacts"]:

                path = self.export_dir / artifact

                if not path.exists():
                    missing.append(artifact)
                    continue

                if path.is_file():
                    archive.write(
                        path,
                        arcname=path.relative_to(self.export_dir),
                    )
                    files.append(artifact)

                if path.is_dir():
                    for child in sorted(path.rglob("*")):

                        if not child.is_file():
                            continue

                        archive.write(
                            child,
                            arcname=child.relative_to(self.export_dir),
                        )

                        files.append(str(child.relative_to(self.export_dir)))

        return {
            "profile": profile,
            "name": export_profile["name"],
            "zip": str(output_zip),
            "files": files,
            "missing": missing,
            "count": len(files),
            "passed": output_zip.exists() and len(missing) == 0,
        }