// Database backup: node --env-file=.env.local scripts/backup-db.mjs [destination]
// Writes two pg_dump archives (custom format) and checks both with pg_restore --list:
//   antojosgo-<date>-public.dump  schema + data of the app tables (public)
//   antojosgo-<date>-auth.dump    accounts (auth.users and auth.identities)
// Default destination is OUTSIDE the repository (backups hold e-mails): ../AntojosGo-respaldos. Keeps the last 10 of each.
// Needs SUPABASE_DB_URL in .env.local and PostgreSQL client tools (PG_BIN, default C:/Program Files/PostgreSQL/17/bin).
// Restore: see docs/RESPALDOS.md (a Supabase project already has auth; a plain Postgres needs extensions first).
// Restaurant photos live in Supabase Storage, not in these files.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

const url = process.env.SUPABASE_DB_URL
if (!url) { console.error('Falta SUPABASE_DB_URL en .env.local'); process.exit(1) }
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/17/bin'
const tool = name => path.join(bin, process.platform === 'win32' ? `${name}.exe` : name)
if (!existsSync(tool('pg_dump'))) { console.error(`No encuentro pg_dump en ${bin}. Define PG_BIN.`); process.exit(1) }

const dest = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'AntojosGo-respaldos'))
if (dest.startsWith(path.resolve(process.cwd()) + path.sep)) { console.error('El destino no puede estar dentro del repositorio.'); process.exit(1) }
mkdirSync(dest, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const hide = text => String(text ?? '').replace(/postgres(ql)?:\/\/\S+/g, '[url]')

function run(name, args) {
  const r = spawnSync(tool(name), args, { encoding: 'utf8', timeout: 10 * 60_000 })
  if (r.status !== 0) { console.error(`${name} falló: ${hide(r.stderr).split('\n').slice(0, 3).join(' ')}`); process.exit(1) }
  return r.stdout
}

const jobs = [
  { file: `antojosgo-${stamp}-public.dump`, args: ['--schema=public', '--no-owner', '--no-privileges'] },
  { file: `antojosgo-${stamp}-auth.dump`, args: ['--no-owner', '--no-privileges', '--table=auth.users', '--table=auth.identities'] },
]
for (const job of jobs) {
  const file = path.join(dest, job.file)
  run('pg_dump', ['--format=custom', ...job.args, `--file=${file}`, url])
  const entries = run('pg_restore', ['--list', file]).split('\n').filter(l => /TABLE DATA/.test(l)).length
  console.log(`✓ ${job.file}  ${(statSync(file).size / 1024).toFixed(0)} KB  ${entries} tablas con datos`)
}

for (const kind of ['public', 'auth']) {
  const old = readdirSync(dest).filter(f => f.endsWith(`-${kind}.dump`)).sort().slice(0, -10)
  for (const f of old) rmSync(path.join(dest, f))
}
console.log(`Respaldos en ${dest}`)
