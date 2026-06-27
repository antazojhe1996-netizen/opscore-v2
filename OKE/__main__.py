import sys

from OKE.registry.command_registry import CommandRegistry

def main():

    if len(sys.argv) < 2:
        print("Usage:")
        print("py -m OKE create specialist <name>")
        return

    command_name = sys.argv[1]
    args = sys.argv[2:]

    return CommandRegistry().dispatch(
        command_name=command_name,
        args=args,
    )


if __name__ == "__main__":
    main()