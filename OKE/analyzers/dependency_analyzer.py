from pathlib import Path


class DependencyAnalyzer:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())
        self.oke_dir = self.root / "OKE"

        self.layers = [
            {
                "name": "CLI",
                "required_paths": [
                    "OKE/__main__.py",
                ],
            },
            {
                "name": "Registry",
                "required_paths": [
                    "OKE/registry/command_registry.py",
                    "OKE/commands/base_command.py",
                ],
            },
            {
                "name": "Commands",
                "required_folder": "OKE/commands",
                "required_suffix": "_command.py",
            },
            {
                "name": "Coordinator",
                "required_folder": "OKE/coordinator",
                "required_suffix": ".py",
            },
            {
                "name": "Orchestrator",
                "required_folder": "OKE/orchestrator",
                "required_suffix": ".py",
            },
            {
                "name": "Specialists",
                "required_folder": "OKE/specialists",
                "required_suffix": ".py",
            },
            {
                "name": "Knowledge",
                "required_folder": "OKE/knowledge",
                "required_suffix": ".py",
            },
            {
                "name": "Parsers",
                "required_folder": "OKE/parsers",
                "required_suffix": ".py",
            },
            {
                "name": "Workspace",
                "required_paths": [
                    "OKE/workspace",
                    "OKE/workspace/reports",
                ],
            },
            {
                "name": "Reports",
                "required_folder": "OKE/workspace/reports",
                "required_suffix": ".json",
            },
            {
                "name": "Export",
                "required_paths": [
                    "OKE_EXPORT",
                    "OKE_EXPORT/OPSCORE_SOURCE_BOOK.md",
                    "OKE_EXPORT/OPSCORE_DATABASE_BOOK.md",
                ],
            },
        ]

    def analyze(self):
        results = []

        for layer in self.layers:
            result = self.check_layer(layer)
            results.append(result)

        score = self.score(results)

        return {
            "score": score,
            "status": self.status(score),
            "layers": results,
            "flow": [layer["name"] for layer in self.layers],
        }

    def check_layer(self, layer):
        name = layer["name"]

        if "required_paths" in layer:
            return self.check_paths(name, layer["required_paths"])

        if "required_folder" in layer:
            return self.check_folder(
                name=name,
                folder=layer["required_folder"],
                suffix=layer.get("required_suffix"),
            )

        return {
            "name": name,
            "status": "MISSING",
            "score": 0,
            "items": [],
        }

    def check_paths(self, name, paths):
        items = []

        for relative_path in paths:
            path = self.root / relative_path

            items.append({
                "path": relative_path,
                "exists": path.exists(),
                "type": "dir" if path.exists() and path.is_dir() else "file",
            })

        passed = len([item for item in items if item["exists"]])
        total = len(items)
        score = round((passed / total) * 100, 2) if total else 0

        return {
            "name": name,
            "status": self.layer_status(score),
            "score": score,
            "items": items,
        }

    def check_folder(self, name, folder, suffix):
        path = self.root / folder

        if not path.exists():
            return {
                "name": name,
                "status": "MISSING",
                "score": 0,
                "folder": folder,
                "file_count": 0,
                "items": [],
            }

        files = [
            item
            for item in sorted(path.rglob("*"))
            if item.is_file()
            and not item.name.startswith("__")
            and (suffix is None or item.name.endswith(suffix))
        ]

        score = 100 if files else 50

        return {
            "name": name,
            "status": self.layer_status(score),
            "score": score,
            "folder": folder,
            "file_count": len(files),
            "items": [
                {
                    "path": str(item.relative_to(self.root)),
                    "size": item.stat().st_size,
                }
                for item in files
            ],
        }

    def score(self, results):
        if not results:
            return 0

        return round(
            sum(item["score"] for item in results) / len(results),
            2,
        )

    def layer_status(self, score):
        if score >= 100:
            return "PASS"

        if score >= 50:
            return "PARTIAL"

        return "MISSING"

    def status(self, score):
        if score >= 95:
            return "READY"

        if score >= 80:
            return "NEEDS REVIEW"

        return "NOT READY"