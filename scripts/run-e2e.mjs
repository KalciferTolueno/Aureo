import { spawnSync } from 'node:child_process'

const pnpm = process.env.npm_execpath
if (!pnpm) throw new Error('No se pudo localizar el ejecutable de pnpm.')

function run(args) {
  const result = spawnSync(process.execPath, [pnpm, ...args], { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['build'])
run(['exec', 'playwright', 'test'])
