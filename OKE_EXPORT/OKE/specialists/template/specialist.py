from OKE.specialists.base import BaseSpecialist


class TemplateSpecialist(BaseSpecialist):

    name = "template"
    display_name = "Template Specialist"
    version = "1.0"

    def analyze(self, **kwargs):

        return {
            "status": "PASS",
            "specialist": self.name,
            "summary": "Replace this with specialist analysis.",
            "findings": [],
            "recommendations": [],
        }

    def describe(self):

        return {
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "responsibility": [
                "Replace with responsibility 1",
                "Replace with responsibility 2",
            ],
        }