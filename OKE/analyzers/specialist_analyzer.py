from pathlib import Path


class SpecialistAnalyzer:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())
        self.specialists_dir = self.root / "OKE" / "specialists"
        self.source_book = self.root / "OKE_EXPORT" / "OPSCORE_SOURCE_BOOK.md"

    def analyze(self):
        specialists = self.scan_specialists()
        source_text = self.read_source_book()

        results = []

        for specialist in specialists:
            name = specialist["name"]

            reference_count = source_text.lower().count(name.lower()) if source_text else 0
            base_specialist_count = specialist["combined_text"].count("BaseSpecialist")
            generator_count = specialist["combined_text"].count("SpecialistGenerator")

            status = self.classify(
                specialist=specialist,
                reference_count=reference_count,
                base_specialist_count=base_specialist_count,
                generator_count=generator_count,
            )

            results.append({
                **self.clean_specialist(specialist),
                "reference_count": reference_count,
                "base_specialist_count": base_specialist_count,
                "generator_count": generator_count,
                "status": status,
            })

        summary = self.summarize(results)
        score = self.score(summary, results)

        return {
            "score": score,
            "summary": summary,
            "specialists": results,
        }

    def scan_specialists(self):
        if not self.specialists_dir.exists():
            return []

        items = []

        for folder in sorted(self.specialists_dir.iterdir()):
            if not folder.is_dir():
                continue

            if folder.name.startswith("__"):
                continue

            file_items = [path for path in folder.rglob("*") if path.is_file()]
            non_empty_files = [
                path for path in file_items
                if path.stat().st_size > 0
            ]

            combined_text = self.read_folder_text(file_items)

            items.append({
                "name": folder.name,
                "path": str(folder),
                "file_count": len(file_items),
                "non_empty_file_count": len(non_empty_files),
                "has_specialist_py": (folder / "specialist.py").exists(),
                "has_readme": (folder / "README.md").exists(),
                "has_pipeline": (folder / "pipeline.py").exists(),
                "has_analyzer": (folder / "analyzer.py").exists(),
                "has_service": (folder / "service.py").exists(),
                "has_knowledge": (folder / "knowledge.py").exists(),
                "has_model": (folder / "model.py").exists(),
                "has_rule": (folder / "rule.py").exists(),
                "combined_text": combined_text,
            })

        return items

    def read_folder_text(self, file_items):
        chunks = []

        for path in file_items:
            try:
                chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
            except Exception:
                pass

        return "\n".join(chunks)

    def read_source_book(self):
        if not self.source_book.exists():
            return ""

        return self.source_book.read_text(
            encoding="utf-8",
            errors="ignore",
        )

    def classify(
        self,
        specialist,
        reference_count,
        base_specialist_count,
        generator_count,
    ):
        name = specialist["name"]

        # Structural/system folders that may intentionally not behave as runtime specialists.
        known_placeholder_names = {
            "docs",
            "template",
            "testing",
            "deployment",
        }

        if name in known_placeholder_names:
            return "PLACEHOLDER"

        if specialist["non_empty_file_count"] == 0:
            return "ORPHAN"

        if generator_count > 0 and base_specialist_count == 0:
            return "GENERATED_TEMPLATE"

        runtime_parts = [
            specialist["has_specialist_py"],
            specialist["has_pipeline"],
            specialist["has_analyzer"],
            specialist["has_service"],
            specialist["has_knowledge"],
            specialist["has_model"],
            specialist["has_rule"],
        ]

        completeness = len([part for part in runtime_parts if part])

        if base_specialist_count > 0 and completeness >= 4:
            return "ACTIVE"

        if base_specialist_count > 0 and completeness >= 2:
            return "PARTIAL"

        if completeness >= 4 and reference_count > 10:
            return "STRUCTURAL"

        if specialist["non_empty_file_count"] <= 1:
            return "SKELETON"

        return "PARTIAL"

    def summarize(self, results):
        statuses = {
            "ACTIVE": 0,
            "PARTIAL": 0,
            "STRUCTURAL": 0,
            "GENERATED_TEMPLATE": 0,
            "PLACEHOLDER": 0,
            "SKELETON": 0,
            "ORPHAN": 0,
        }

        for item in results:
            status = item["status"]
            statuses[status] = statuses.get(status, 0) + 1

        return {
            "total_specialists": len(results),
            **statuses,
        }

    def score(self, summary, results):
        if not results:
            return 0

        weights = {
            "ACTIVE": 100,
            "PARTIAL": 70,
            "STRUCTURAL": 80,
            "GENERATED_TEMPLATE": 65,
            "PLACEHOLDER": 60,
            "SKELETON": 30,
            "ORPHAN": 0,
        }

        total = 0

        for item in results:
            total += weights.get(item["status"], 0)

        return round(total / len(results), 2)

    def clean_specialist(self, specialist):
        return {
            key: value
            for key, value in specialist.items()
            if key != "combined_text"
        }