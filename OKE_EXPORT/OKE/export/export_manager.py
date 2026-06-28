from OKE.export.review_package_generator import ReviewPackageGenerator
from OKE.export.copy_manager import CopyManager
from OKE.export.zip_packager import ZipPackager


class ExportManager:

    def __init__(self):

        self.review_generator = ReviewPackageGenerator()
        self.copy_manager = CopyManager()
        self.zip_packager = ZipPackager()

    def export(self, profile="review"):

        generated_files = self.review_generator.generate()

        copy_result = self.copy_manager.copy()

        if not copy_result["passed"]:
            return {
                "profile": profile,
                "passed": False,
                "stage": "copy",
                "generated_files": [str(path) for path in generated_files],
                "copy_result": copy_result,
                "zip_result": None,
            }

        zip_result = self.zip_packager.package(profile)

        return {
            "profile": profile,
            "passed": zip_result["passed"],
            "stage": "complete",
            "generated_files": [str(path) for path in generated_files],
            "copy_result": copy_result,
            "zip_result": zip_result,
        }