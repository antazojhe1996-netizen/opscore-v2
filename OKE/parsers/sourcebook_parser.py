from pathlib import Path


class SourceBookParser:

    def __init__(self, root=None):
        self.root = Path(root or Path.cwd())
        self.source_book = self.find_source_book()

    def find_source_book(self):
        candidates = [
            self.root / "OPSCORE_SOURCE_BOOK.md",
            self.root / "OKE_EXPORT" / "OPSCORE_SOURCE_BOOK.md",
            self.root / "docs" / "OPSCORE_SOURCE_BOOK.md",
            self.root / "OKE" / "docs" / "OPSCORE_SOURCE_BOOK.md",
        ]

        for candidate in candidates:
            if candidate.exists():
                return candidate

        return None

    def exists(self):
        return self.source_book is not None and self.source_book.exists()

    def read_lines(self):
        if not self.exists():
            return []

        return self.source_book.read_text(
            encoding="utf-8",
            errors="ignore",
        ).splitlines()

    def parse_files(self):
        lines = self.read_lines()
        files = []
        current = None

        for line_number, line in enumerate(lines, start=1):

            # Actual Source Book file header format:
            # # .\app\(app)\finance\page.tsx
            if line.startswith("# .\\") or line.startswith("# ./"):
                if current:
                    files.append(current)

                current = {
                    "path": line.replace("# ", "").strip(),
                    "start_line": line_number,
                    "end_line": line_number,
                    "lines": [],
                    "area": self.classify_path(line),
                    "module": self.detect_module(line),
                }
                continue

            if current:
                current["lines"].append({
                    "line": line_number,
                    "text": line,
                })
                current["end_line"] = line_number

        if current:
            files.append(current)

        return files

    def search(self, keyword):
        keyword_lower = keyword.lower()
        matches = []

        for file in self.parse_files():
            for item in file["lines"]:
                text = item["text"]
                if keyword_lower in text.lower() or keyword_lower in file["path"].lower():
                    matches.append({
                        "file": file["path"],
                        "area": file["area"],
                        "module": file["module"],
                        "line": item["line"],
                        "text": text.strip(),
                    })

        return matches

    def module_files(self, module_keyword):
        key = module_keyword.lower()
        result = []

        for file in self.parse_files():
            path = file["path"].lower()
            module = (file["module"] or "").lower()

            if key in path or key in module:
                result.append(file)

        return result

    def classify_path(self, raw_path):
        value = raw_path.lower().replace("\\", "/")

        if "/app/api/" in value:
            return "API"

        if "/app/lib/" in value or value.startswith("# ./app/lib") or value.startswith("# .\\app\\lib"):
            return "ENGINE_OR_SERVICE"

        if "/lib/" in value and "/app/" not in value:
            return "SHARED_LIB"

        if "/components/" in value:
            return "COMPONENT"

        if "watcher" in value or "report" in value or "dashboard" in value:
            return "REPORT"

        if "page.tsx" in value or "layout.tsx" in value:
            return "UI"

        if "/oke/" in value:
            return "OKE"

        return "OTHER"

    def detect_module(self, raw_path):
        value = raw_path.lower().replace("\\", "/")
        value = value.replace("# ./", "").replace("# .\\", "")

        if "/finance/" in value:
            return "finance"
        if "/pos/" in value:
            return "pos"
        if "/payroll/" in value:
            return "payroll"
        if "/human-resources/" in value:
            return "human_resources"
        if "/leave-management/" in value:
            return "leave_management"
        if "/manager/approval" in value or "approval" in value:
            return "approval"
        if "cash" in value:
            return "cash"
        if "employee" in value:
            return "employees"
        if "schedule" in value or "attendance" in value:
            return "workforce"
        if "reservation" in value or "forecasting" in value:
            return "reservations"
        if "/settings/" in value:
            return "settings"
        if "/oke/" in value:
            return "oke"

        return "general"

    def group_matches(self, matches):
        grouped = {}

        for match in matches:
            area = match.get("area", "UNKNOWN")
            grouped.setdefault(area, []).append(match)

        return grouped