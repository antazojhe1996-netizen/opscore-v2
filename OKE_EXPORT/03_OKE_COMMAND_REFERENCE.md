# OKE Command Reference

Run commands from the project root.

```powershell
py -m OKE analyze <table_or_target>
py -m OKE audit <module>
py -m OKE create specialist <name>
py -m OKE database all
py -m OKE dependency
py -m OKE doctor
py -m OKE export --full
py -m OKE export --ai
py -m OKE impact <table_or_target>
py -m OKE map <module>
py -m OKE relation <table>
py -m OKE self-audit
py -m OKE source <keyword>
py -m OKE specialist-report
py -m OKE trace <keyword>
py -m OKE validate-export
py -m OKE release
```

## Continuity Workflow

After every major milestone:

```powershell
py -m OKE release
```
