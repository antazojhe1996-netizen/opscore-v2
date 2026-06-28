from OKE.commands.base_command import BaseCommand
from OKE.export.export_manager import ExportManager
from OKE.export.profiles import ExportProfiles


class ExportCommand(BaseCommand):
    name = "export"

    def execute(self, args):
        profile = "full"

        if args:
            profile = args[0].lower().replace("--", "")

        if profile not in ExportProfiles.names():
            print("Unknown export profile.")
            print()
            print("Available profiles:")
            for name in ExportProfiles.names():
                print(f"- {name}")
            return

        manager = ExportManager()
        result = manager.export(profile=profile)

        print("=" * 60)
        print("OKE EXPORT")
        print("=" * 60)
        print()
        print(f"Profile : {result['profile']}")
        print(f"Passed  : {result['passed']}")
        print(f"Stage   : {result['stage']}")
        print()

        print("Generated Files")
        print("---------------")
        for path in result["generated_files"]:
            print(f"- {path}")

        print()
        print("Copy Result")
        print("-----------")
        print(f"Passed : {result['copy_result']['passed']}")

        if result["zip_result"]:
            print()
            print("ZIP Result")
            print("----------")
            print(f"Name   : {result['zip_result']['name']}")
            print(f"ZIP    : {result['zip_result']['zip']}")
            print(f"Files  : {result['zip_result']['count']}")
            print(f"Passed : {result['zip_result']['passed']}")

            if result["zip_result"]["missing"]:
                print()
                print("Missing Artifacts")
                print("-----------------")
                for item in result["zip_result"]["missing"]:
                    print(f"- {item}")

        print()
        if result["passed"]:
            print("Export package ready.")
        else:
            print("Export package has issues. Review missing artifacts.")