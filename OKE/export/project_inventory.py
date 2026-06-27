from pathlib import Path


class ProjectInventory:

    def __init__(self):

        self.project_root = Path.cwd()
        self.oke_root = self.project_root / "OKE"

    def _python_files(self, folder, pattern="*.py"):

        root = self.oke_root / folder

        if not root.exists():
            return []

        return sorted([
            path
            for path in root.glob(pattern)
            if not path.name.startswith("__")
        ])

    def commands(self):

        commands = []

        for path in self._python_files("commands", "*_command.py"):

            if path.stem == "base_command":
                continue

            commands.append({
                "name": path.stem.replace("_command", ""),
                "class": "".join(
                    word.capitalize()
                    for word in path.stem.split("_")
                ),
                "file": path.name,
            })

        return commands

    def specialists(self):

        root = self.oke_root / "specialists"

        if not root.exists():
            return []

        specialists = []

        for folder in sorted(root.iterdir()):

            if not folder.is_dir():
                continue

            specialist = folder / "specialist.py"

            if not specialist.exists():
                continue

            specialists.append({
                "name": folder.name,
                "status": "ACTIVE",
            })

        return specialists

    def modules(self, folder, kind):

        modules = []

        for path in self._python_files(folder):

            modules.append({
                "name": path.stem,
                "type": kind,
                "file": path.name,
            })

        return modules

    def handbook(self):

        root = (
            self.oke_root
            / "docs"
            / "ENGINEERING_HANDBOOK"
        )

        if not root.exists():
            return []

        return sorted([
            {
                "title": path.stem,
                "file": path.name,
            }
            for path in root.glob("*.md")
        ], key=lambda x: x["file"])

    def build(self):

        return {
            "commands": self.commands(),
            "specialists": self.specialists(),
            "builders": self.modules("builders", "builder"),
            "analyzers": self.modules("analyzers", "analyzer"),
            "pipelines": self.modules("pipelines", "pipeline"),
            "services": self.modules("services", "service"),
            "handbook": self.handbook(),
        }