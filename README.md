# records-guard

A Claude mod that makes dated records immutable. Any session that tries to edit, overwrite, move, append to or delete a dated record (`records/YYYY-MM-DD-topic.md`, or the older `record/` spelling) is refused before the command runs. Creating a new record stays allowed. A correction is always a new dated record that points at the old one.

## What it watches

| Tool | Rule |
|---|---|
| Edit | any dated record: refused |
| Write | a dated record that already exists: refused |
| Bash, linked-Mac shell | a command that names a dated record and uses `sed -i`, `mv`, `rm`, `cp`, `tee`, `>>` and similar: refused. A new record may be written with `>` only after `set -C` (noclobber), so it can never overwrite an old one |
| Commit to the Mac | a forced commit over a dated record: refused |

Undated logs in a records folder (`pilot-log.md`, `queue-closed.md`) are append-only by design and are not frozen.

## Limits

Shell commands are text. A command written to dodge the patterns can get through. This catches mistakes, not vandals.

## Install

At the prompt of a terminal session:

```
/plugin install records-guard --marketplace activestylus/records-guard
```

From a shell:

```
claude plugin install records-guard --marketplace activestylus/records-guard
```
