import json

from OKE.export.collector import ExportCollector
from OKE.export.manifest import ExportManifest
from OKE.export.packager import ExportPackager


class ExportManager:

    def export(self):

        collector = ExportCollector()
        packager = ExportPackager()

        files = collector.collect_files()
        manifest = ExportManifest().build(files)

        packager.reset()
        output_dir = packager.package_files(files)

        manifest_path = output_dir / "manifest.json"

        manifest_path.write_text(
            json.dumps(manifest, indent=2),
            encoding="utf-8",
        )

        return output_dir