import { expect, test } from 'claude-code/testing'
import { judgeShell } from './register'

test('the shell judge', async () => {
  const R = 'brainiac/records/2026-11-01-plain-words-and-brain.md'
  expect(judgeShell(`cat ${R}`)).toBe(undefined)
  expect(judgeShell(`grep -n lesson ${R}`)).toBe(undefined)
  expect(judgeShell(`sed -i 's/a/b/' ${R}`)).not.toBe(undefined)
  expect(judgeShell(`mv ${R} /tmp/x.md`)).not.toBe(undefined)
  expect(judgeShell(`echo hi > ${R}`)).not.toBe(undefined)
  expect(judgeShell(`echo hi >> ${R}`)).not.toBe(undefined)
  expect(judgeShell(`set -C; cat > brainiac/records/2026-11-02-new.md <<X\nhi\nX`)).toBe(undefined)
  expect(judgeShell(`printf 'row' >> fp/prepress/port/record/pilot-log.md`)).toBe(undefined)
  expect(judgeShell(`mv write/WW/record/2026-09-01-x.md archive/`)).not.toBe(undefined)
  expect(judgeShell(`cp ${R} /dev/null`)).toBe(undefined)
  expect(judgeShell(`cp /tmp/x.md ${R}`)).not.toBe(undefined)
  expect(judgeShell(`cp /tmp/x.md brainiac/records/`)).not.toBe(undefined)
})

test('Edit on a dated record is refused, other files pass', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  const blocked = await $.tool.call({ tool: 'Edit', file_path: '/x/brainiac/records/2026-10-31-the-baton.md', old_string: 'a', new_string: 'b' })
  expect(String((blocked as { deny?: string }).deny ?? '')).toContain('records-guard')
  const fine = await $.tool.call({ tool: 'Edit', file_path: '/x/brainiac/brain/MAP.md', old_string: 'a', new_string: 'b' })
  expect((fine as { deny?: string }).deny).toBe(undefined)
})
