# Engineering Workflow

## Before Coding

1. Search existing source.
2. Trace existing classes/functions.
3. Check dependency flow.
4. Run doctor.
5. Decide whether to extend existing code or create a new module.

## Standard Commands

```powershell
py -m OKE source <keyword>
py -m OKE trace <keyword>
py -m OKE dependency
py -m OKE doctor
```

## After Coding

```powershell
py -m OKE release
```

## Rule

Do not create duplicate analyzers, commands, exporters, or parsers. Check first, extend second.
