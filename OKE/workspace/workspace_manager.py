from datetime import datetime

from OKE.workspace.repository import WorkspaceRepository


class WorkspaceManager:

    def __init__(self):

        self.repository = WorkspaceRepository()

    def save_report(self, name, data):

        payload = {
            "name": name,
            "generated_at": datetime.now().isoformat(),
            "data": data,
        }

        return self.repository.write_json(
            "reports",
            name,
            payload,
        )

    def load_report(self, name):

        return self.repository.read_json(
            "reports",
            name,
        )