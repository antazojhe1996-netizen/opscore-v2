from datetime import datetime


class ExportManifest:

    def build(self, files):

        return {
            "name": "OKE Engineering Export",
            "generated_at": datetime.now().isoformat(),
            "file_count": len(files),
            "purpose": "Complete portable engineering context for audit, review, and continuity.",
        }