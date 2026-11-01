import type { Register } from 'claude-code'

// A dated record: .../record(s)/[any subfolders/]YYYY-MM-DD-<topic>.md
// Undated logs in the same folder (pilot-log.md, queue-closed.md) are append-only
// by design and are NOT frozen here.
export const DATED_RECORD = /(^|[\/\s'"])(records?)\/(?:[^\s'"]*\/)?\d{4}-\d{2}-\d{2}-[^\s'"\/]*\.md\b/

// Shell verbs that change or remove a file.
const MUTATORS = /\b(sed\s+(-\w*\s+)*-i|perl\s+(-\w+\s+)*-p?i|mv|rm|rmdir|unlink|truncate|tee|dd|chmod|chflags|touch)\b/
// Copy-like verbs harm a record only when the record is the DESTINATION (last argument).
const COPIERS = /^\s*(sudo\s+)?(cp|rsync|ln|install)\b/
// A redirect into a dated record: > or >> followed by the path.
const REDIRECT_INTO = /(>>?|>\|)\s*[^\s;&|]*(records?)\/(?:[^\s'"]*\/)?\d{4}-\d{2}-\d{2}-[^\s'"\/]*\.md/
const NOCLOBBER = /\bset\s+(-C\b|-o\s+noclobber\b)/

export function judgeShell(command: string): string | undefined {
  if (DATED_RECORD.test(command)) {
    const redirect = command.match(REDIRECT_INTO)
    if (redirect) {
      if (redirect[1] !== '>') return 'appends to or force-writes a dated record'
      if (!NOCLOBBER.test(command)) return 'writes a dated record without `set -C` (noclobber); a new record must be created so it cannot overwrite an old one'
    }
    if (MUTATORS.test(command)) return 'runs a command that can change, move or remove a dated record'
  }
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    if (!COPIERS.test(segment)) continue
    const args = segment.trim().split(/\s+/)
    const last = args[args.length - 1] ?? ''
    if (DATED_RECORD.test(` ${last}`) || /(^|\/)records?\/?$/.test(last))
      return 'copies or links over a dated record (or into a records folder)'
  }
  return undefined
}

const deny = (why: string) => ({ deny: `records-guard: refused, ${why}. Records are immutable: a correction is a NEW dated record that points at the old one.` })

export const register: Register = on => {
  // Claude Code file tools on a local machine.
  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    DATED_RECORD.test(` ${e.file_path}`) ? deny(`edits ${e.file_path}`) : next(e),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: 'records-guard: its check failed, so it refused.' }))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    if (DATED_RECORD.test(` ${e.file_path}`) && (await $.fs.exists(e.file_path)))
      return deny(`would overwrite ${e.file_path}`)
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'records-guard: its check failed, so it refused.' }))

  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const why = judgeShell(e.command)
    return why ? deny(why) : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'records-guard: its check failed, so it refused.' }))

  // The linked-Mac shell (Cowork / cloud sessions).
  on('tool.call', { tool: 'mcp__remote-devices__device_bash' }, ($, e, next) => {
    const why = judgeShell(String((e as { command?: unknown }).command ?? ''))
    return why ? deny(why) : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'records-guard: its check failed, so it refused.' }))

  // Copying files back to the Mac: a forced commit over a dated record is refused.
  on('tool.call', { tool: 'mcp__remote-devices__device_commit_files' }, ($, e, next) => {
    const input = e as { force?: boolean; files?: { devicePath?: string }[] }
    const hit = (input.files ?? []).find(f => DATED_RECORD.test(` ${f.devicePath ?? ''}`))
    return hit && input.force ? deny(`force-commits over ${hit.devicePath}`) : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'records-guard: its check failed, so it refused.' }))
}
