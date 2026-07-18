# Venice Lofts documentation

Setup guides for the repo as it exists **today**, plus notes on what is planned next.

## Recommended order

1. **[Initial setup](initial-setup.md)** — clone, install, database, `.env.local`, first `pnpm dev`
2. **[Azure configuration](azure.md)** — Microsoft sign-in for the dashboard (required); Graph sync (future)
3. **[First scan](first-scan.md)** — configure and run `pnpm scan` on your Mac

## Also

- **[Employee setup](employee-setup.md)** — dashboard access for team members (no scanner, no server secrets)

## What is built vs planned

| Area                                            | Status today  | Guide                                                |
| ----------------------------------------------- | ------------- | ---------------------------------------------------- |
| Dashboard + Microsoft sign-in                   | Works         | [initial-setup](initial-setup.md), [azure](azure.md) |
| Database (`events`, `sources`, `scan_runs`, …)  | Works         | [initial-setup](initial-setup.md)                    |
| Local scanner (`pnpm scan`, IMAP / PDF folders) | Works         | [first-scan](first-scan.md)                          |
| Org tables, Graph server sync, mailbox admin UI | Not built yet | Mentioned in [azure](azure.md) for later             |

The root [README](../README.md) describes the **target Ops MVP**. These docs match **what you can run right now**.
