from OKE.generators.specialist_generator import SpecialistGenerator


class CLICommands:

    def create_specialist(self, name):

        generator = SpecialistGenerator()
        path = generator.create(name)

        print("✓ Specialist created")
        print(path)
