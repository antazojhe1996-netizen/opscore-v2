from pathlib import Path
import ast


class RegistryAnalyzer:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())
        self.commands_dir = self.root / "OKE" / "commands"
        self.registry_file = self.root / "OKE" / "registry" / "command_registry.py"

    def analyze(self):
        command_files = self.get_command_files()
        registered_imports = self.get_registered_imports()
        command_classes = self.get_command_classes(command_files)

        orphan_commands = []
        registered_commands = []

        for item in command_classes:
            class_name = item["class_name"]

            is_registered = class_name in registered_imports

            result = {
                **item,
                "registered": is_registered,
            }

            if is_registered:
                registered_commands.append(result)
            else:
                orphan_commands.append(result)

        score = 100

        if command_classes:
            score = round(
                (len(registered_commands) / len(command_classes)) * 100,
                2,
            )

        return {
            "score": score,
            "command_file_count": len(command_files),
            "command_class_count": len(command_classes),
            "registered_count": len(registered_commands),
            "orphan_count": len(orphan_commands),
            "registered_commands": registered_commands,
            "orphan_commands": orphan_commands,
        }

    def get_command_files(self):
        if not self.commands_dir.exists():
            return []

        return sorted(self.commands_dir.glob("*_command.py"))

    def get_registered_imports(self):
        if not self.registry_file.exists():
            return []

        text = self.registry_file.read_text(
            encoding="utf-8",
            errors="ignore",
        )

        imported = []

        for line in text.splitlines():
            line = line.strip()

            if not line.startswith("from OKE.commands."):
                continue

            if " import " not in line:
                continue

            imported_name = line.split(" import ", 1)[1].strip()
            imported.append(imported_name)

        return imported

    def get_command_classes(self, command_files):
        items = []

        for path in command_files:
            try:
                tree = ast.parse(
                    path.read_text(
                        encoding="utf-8",
                        errors="ignore",
                    )
                )
            except Exception as error:
                items.append({
                    "file": str(path),
                    "class_name": None,
                    "command_name": None,
                    "parse_error": str(error),
                })
                continue

            for node in tree.body:
                if not isinstance(node, ast.ClassDef):
                    continue

                command_name = None

                for child in node.body:
                    if isinstance(child, ast.Assign):
                        for target in child.targets:
                            if getattr(target, "id", None) == "name":
                                if isinstance(child.value, ast.Constant):
                                    command_name = child.value.value

                items.append({
                    "file": str(path),
                    "class_name": node.name,
                    "command_name": command_name,
                    "parse_error": None,
                })

        return items