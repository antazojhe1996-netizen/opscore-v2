from datetime import datetime

from OKE.export.project_inventory import ProjectInventory


class ManifestBuilder:

    def __init__(self):

        self.inventory = ProjectInventory()

    def build(self):

        inventory = self.inventory.build()

        return {
            "project": {
                "name": "OKE",
                "full_name": "OPSCORE Knowledge Engine",
                "type": "Engineering Operating System",
                "primary_language": "Python",
            },
            "generated_at": datetime.now().isoformat(),
            "status": {
                "foundation": "IN_PROGRESS",
                "architecture": "STABLE",
                "export_system": "IN_PROGRESS",
            },
            "counts": {
                "commands": len(inventory.get("commands", [])),
                "specialists": len(inventory.get("specialists", [])),
                "pipelines": len(inventory.get("pipelines", [])),
                "services": len(inventory.get("services", [])),
                "builders": len(inventory.get("builders", [])),
                "analyzers": len(inventory.get("analyzers", [])),
                "handbook_chapters": len(inventory.get("handbook", [])),
            },
            "inventory": inventory,
        }