'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAccountSession } from '@/hooks/use-account-session'
import { webApi } from '@/lib/web-api'
import { getSupabase } from '@/lib/supabase/client'
import AccountAccess from '@/components/account-access'
import FoodLoader from '@/components/food-loader'
import { Stars } from '@/components/reviews'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Superadmin panel (Spanish only, internal tool). Every call goes through /api/v1/admin/<action>;
// the database re-checks admin + second factor and records each change in the audit log.

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-GT', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

type Overview = Record<string, number | null> & {
  top_searches: { concept: string; hits: number }[]
  published_no_dishes: Named[]; published_no_hours: Named[]; stale_empty: Named[]
}
type Named = { id: string; name: string }
type Branch = { id: string; name: string; municipality: string; status: 'draft' | 'published' | 'inactive'; has_location: boolean; has_hours: boolean }
type Restaurant = {
  id: string; name: string; business_type: string | null; created_at: string; suspended_at: string | null; suspension_reason: string | null
  deleted_at: string | null; owner_email: string | null; dishes: number; dishes_published: number; branches: Branch[]
}
type User = {
  id: string; email: string; name: string | null; provider: string | null; created_at: string; last_sign_in_at: string | null
  confirmed: boolean; banned_until: string | null; is_admin: boolean; restaurants: number; reviews: number; favorites: number
}
type Review = {
  id: string; restaurant_name: string; dish_name: string; rating: number; comment: string | null; reply: string | null
  report_reason: string | null; reported_at: string | null; hidden_at: string | null; updated_at: string; author_email: string | null
}
type Admin = { user_id: string; email: string; since: string; mfa: boolean }
type AuditEntry = {
  id: number; at: string; admin_email: string | null; action: string; target_type: string; target_label: string | null
  reason: string | null; before: unknown; after: unknown
}

/** A pending action: asks for the reason (and a value or a typed confirmation) before running. */
type Ask = {
  title: string; detail?: string; danger?: boolean
  confirm?: string
  input?: { label: string; type?: string; options?: [value: string, label: string][] }
  run: (reason: string, value: string) => Promise<unknown>
}

const TABS = [['inicio', 'Inicio'], ['restaurantes', 'Restaurantes'], ['usuarios', 'Usuarios'], ['resenas', 'Reseñas'], ['admins', 'Administradores'], ['auditoria', 'Auditoría']] as const
type Tab = typeof TABS[number][0]

export default function AdminPage() {
  const { user, loading } = useAccountSession()
  const [access, setAccess] = useState<'checking' | 'denied' | 'mfa' | 'ready'>('checking')
  const [tab, setTab] = useState<Tab>('inicio')
  const [ask, setAsk] = useState<Ask | null>(null)
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!user) return
    setAccess('checking')
    webApi.admin<boolean>('whoami').then(ok => setAccess(ok ? 'mfa' : 'denied')).catch(() => setAccess('denied'))
  }, [user?.id])

  if (loading || (user && access === 'checking')) return <main className="flex min-h-dvh items-center justify-center"><FoodLoader /></main>
  if (!user) return <AccountAccess audience="customer" onBack={() => { window.location.href = '/' }} />
  if (access === 'denied') return <Shell><p className="rounded-xl border bg-white p-4">Esta sección es solo para administradores de AntojosGo.</p></Shell>
  if (access === 'mfa') return <Shell><MfaGate onDone={() => setAccess('ready')} /></Shell>

  const done = (text: string) => { setNotice(text); setVersion(v => v + 1) }
  const props = { version, setAsk, done }
  return <Shell>
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Secciones del panel">
      {TABS.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setNotice('') }} aria-current={tab === id ? 'page' : undefined}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${tab === id ? 'bg-[#173F35] text-white' : 'bg-white text-stone-700 hover:bg-stone-100'}`}>{label}</button>)}
    </nav>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {tab === 'inicio' && <OverviewTab {...props} go={setTab} />}
    {tab === 'restaurantes' && <RestaurantsTab {...props} />}
    {tab === 'usuarios' && <UsersTab {...props} me={user.id} />}
    {tab === 'resenas' && <ReviewsTab {...props} />}
    {tab === 'admins' && <AdminsTab {...props} me={user.id} />}
    {tab === 'auditoria' && <AuditTab {...props} />}
    {ask && <AskDialog ask={ask} onClose={() => setAsk(null)} />}
  </Shell>
}

type TabProps = { version: number; setAsk: (a: Ask) => void; done: (text: string) => void }

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-dvh max-w-5xl space-y-4 bg-background p-4 sm:p-8">
    <header className="flex items-center gap-3"><img src="/logo.png" alt="" width={44} height={44} className="rounded-xl" />
      <div><p className="text-sm font-semibold text-primary">AntojosGo</p><h1 className="text-2xl font-bold">Panel de administración</h1></div>
      <Button variant="outline" size="sm" className="ml-auto" onClick={async () => { await getSupabase()?.auth.signOut(); window.location.href = '/' }}>Cerrar sesión</Button></header>
    {children}
  </main>
}

/** Loads one admin action; reloads when args or version change. */
function useAdmin<T>(action: string, args: Record<string, unknown>, version: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const key = JSON.stringify(args)
  useEffect(() => {
    let active = true; setError('')
    const timer = setTimeout(() => webApi.admin<T>(action, args).then(d => { if (active) setData(d) }).catch(e => { if (active) setError(e.message) }), 250)
    return () => { active = false; clearTimeout(timer) }
  }, [action, key, version]) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error }
}

function Loading<T>({ data, error, children }: { data: T | null; error: string; children: (d: T) => ReactNode }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  return data === null ? <FoodLoader label="Cargando…" /> : <>{children(data)}</>
}

// ---------- Second factor ----------
function MfaGate({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<{ svg: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const mfa = getSupabase()!.auth.mfa
    ;(async () => {
      const { data: aal } = await mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') return onDone()
      const { data } = await mfa.listFactors()
      if (data?.totp[0]) return setFactorId(data.totp[0].id)
      // A setup left half-way blocks a new one: remove unverified factors first.
      for (const f of data?.all ?? []) if (f.status === 'unverified') await mfa.unenroll({ factorId: f.id })
      const { data: e, error } = await mfa.enroll({ factorType: 'totp', friendlyName: 'AntojosGo admin' })
      if (error) throw error
      setFactorId(e.id); setQr({ svg: e.totp.qr_code, secret: e.totp.secret })
    })().catch(e => setError(`No pudimos preparar la verificación en dos pasos: ${e.message}`))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  async function verify(ev: FormEvent) {
    ev.preventDefault(); setBusy(true); setError('')
    const { error } = await getSupabase()!.auth.mfa.challengeAndVerify({ factorId: factorId!, code: code.trim() })
    setBusy(false)
    if (error) setError('Código incorrecto o vencido. Escribe el código que muestra la app ahora.'); else onDone()
  }
  return <form onSubmit={verify} className="max-w-md space-y-3 rounded-xl border bg-white p-5">
    <h2 className="text-lg font-semibold">Verificación en dos pasos</h2>
    {qr ? <>
      <p className="text-sm">El panel exige un segundo factor. Escanea este código con Google Authenticator, Microsoft Authenticator o Authy y escribe el código de 6 dígitos que aparece.</p>
      <img src={qr.svg} alt="Código QR para la app de autenticación" width={180} height={180} className="rounded-lg border" />
      <p className="text-xs text-muted-foreground">Si no puedes escanear, ingresa esta clave a mano: <code className="select-all break-all">{qr.secret}</code></p>
    </> : <p className="text-sm">Escribe el código de 6 dígitos de tu app de autenticación.</p>}
    <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value)} aria-label="Código de verificación" disabled={!factorId} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={busy || !factorId || code.trim().length !== 6}>{busy ? 'Verificando…' : 'Verificar'}</Button>
  </form>
}

// ---------- Confirmation with reason ----------
function AskDialog({ ask, onClose }: { ask: Ask; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [value, setValue] = useState(ask.input?.options?.[0][0] ?? '')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = reason.trim().length >= 3 && (!ask.input || value.trim()) && (!ask.confirm || typed.trim().toLowerCase() === ask.confirm.toLowerCase())
  async function submit(ev: FormEvent) {
    ev.preventDefault(); setBusy(true); setError('')
    try { await ask.run(reason.trim(), value.trim()); onClose() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent>
      <form onSubmit={submit} className="space-y-3">
        <DialogHeader><DialogTitle>{ask.title}</DialogTitle>{ask.detail && <DialogDescription>{ask.detail}</DialogDescription>}</DialogHeader>
        {ask.input && <label className="block space-y-1 text-sm"><span className="font-medium">{ask.input.label}</span>
          {ask.input.options
            ? <select className="w-full rounded-md border bg-white p-2" value={value} onChange={e => setValue(e.target.value)}>{ask.input.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            : <Input type={ask.input.type ?? 'text'} value={value} onChange={e => setValue(e.target.value)} />}</label>}
        <label className="block space-y-1 text-sm"><span className="font-medium">Motivo (queda en la auditoría)</span>
          <Input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} autoFocus /></label>
        {ask.confirm && <label className="block space-y-1 text-sm"><span className="font-medium">Para confirmar escribe <b className="select-all">{ask.confirm}</b></span>
          <Input value={typed} onChange={e => setTyped(e.target.value)} /></label>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={!ready || busy} className={ask.danger ? 'bg-red-700 hover:bg-red-800' : ''}>{busy ? 'Aplicando…' : 'Confirmar'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

// ---------- Tabs ----------
function OverviewTab({ version, go }: TabProps & { go: (t: Tab) => void }) {
  const r = useAdmin<Overview>('overview', {}, version)
  return <Loading {...r}>{o => <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Cuentas" value={o.users} sub={`${o.users_new_7d} nuevas · ${o.users_active_7d} activas (7 días)`} />
      <Stat label="Restaurantes" value={o.restaurants} sub={`${o.restaurants_suspended} suspendidos · ${o.restaurants_deleted} eliminados`} />
      <Stat label="Sedes publicadas" value={o.branches_published} sub={`${o.branches_draft} en borrador`} />
      <Stat label="Platillos publicados" value={o.dishes_published} />
      <Stat label="Reseñas" value={o.reviews} sub={`${o.reviews_reported} reportadas`} />
      <Stat label="Búsquedas (7 días)" value={o.searches_7d} />
      <Stat label="Opinión de la app" value={o.feedback_avg ?? '—'} sub={`${o.feedback_count} calificaciones`} />
      <Stat label="Cuentas suspendidas" value={o.users_banned} />
    </div>
    <section className="space-y-2 rounded-xl border bg-white p-4"><h2 className="font-semibold">Requiere atención</h2>
      {!o.reviews_reported && !o.published_no_dishes.length && !o.published_no_hours.length && !o.stale_empty.length && <p className="text-sm text-muted-foreground">Nada pendiente.</p>}
      {!!o.reviews_reported && <Alert onClick={() => go('resenas')}>{o.reviews_reported} reseña(s) reportada(s) por revisar</Alert>}
      {o.published_no_dishes.length > 0 && <Alert onClick={() => go('restaurantes')}>Publicados sin platillos: {o.published_no_dishes.map(x => x.name).join(', ')}</Alert>}
      {o.published_no_hours.length > 0 && <Alert onClick={() => go('restaurantes')}>Sedes publicadas sin horario: {o.published_no_hours.map(x => x.name).join(', ')}</Alert>}
      {o.stale_empty.length > 0 && <Alert onClick={() => go('restaurantes')}>Más de 14 días sin ningún platillo: {o.stale_empty.map(x => x.name).join(', ')}</Alert>}
    </section>
    <section className="space-y-2 rounded-xl border bg-white p-4"><h2 className="font-semibold">Lo más buscado (30 días)</h2>
      {o.top_searches.length ? <ol className="list-decimal space-y-0.5 pl-5 text-sm">{o.top_searches.map(s => <li key={s.concept}>{s.concept} <span className="text-muted-foreground">({s.hits})</span></li>)}</ol>
        : <p className="text-sm text-muted-foreground">Sin búsquedas todavía.</p>}
    </section>
  </div>}</Loading>
}

const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) =>
  <div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
const Alert = ({ children, onClick }: { children: ReactNode; onClick: () => void }) =>
  <button onClick={onClick} className="block w-full rounded-lg bg-amber-50 p-2 text-left text-sm text-amber-950 hover:bg-amber-100">{children}</button>
const Badge = ({ children, tone = 'stone' }: { children: ReactNode; tone?: 'stone' | 'green' | 'red' | 'amber' }) =>
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${{ stone: 'bg-stone-100 text-stone-700', green: 'bg-emerald-100 text-emerald-900', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-900' }[tone]}`}>{children}</span>
const Search = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) =>
  <Input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="bg-white" />

const STATUS: Record<Branch['status'], [string, 'green' | 'stone' | 'red']> = { published: ['Publicada', 'green'], draft: ['Borrador', 'stone'], inactive: ['Suspendida', 'red'] }

function RestaurantsTab({ version, setAsk, done }: TabProps) {
  const [q, setQ] = useState('')
  const r = useAdmin<Restaurant[]>('restaurants', { p_q: q || undefined }, version)
  const act = (action: string, args: Record<string, unknown>, text: string) => async (reason: string, value: string) => {
    await webApi.admin(action, { ...args, p_reason: reason, ...(action === 'restaurant-transfer' ? { p_email: value } : {}) }); done(text)
  }
  return <div className="space-y-3">
    <Search value={q} onChange={setQ} placeholder="Buscar por nombre o correo del dueño" />
    <Loading {...r}>{list => list.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : <>{list.map(x =>
      <article key={x.id} className={`space-y-2 rounded-xl border bg-white p-4 ${x.deleted_at ? 'opacity-70' : ''}`}>
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{x.name}</h3>
          {x.business_type && <Badge>{x.business_type}</Badge>}
          {x.suspended_at && <Badge tone="red">Suspendido</Badge>}{x.deleted_at && <Badge tone="red">Eliminado {when(x.deleted_at)}</Badge>}
          {x.dishes_published === 0 && x.branches.some(b => b.status === 'published') && <Badge tone="amber">Publicado sin platillos</Badge>}</div>
        <p className="text-sm text-muted-foreground">Dueño: {x.owner_email ?? '—'} · creado {when(x.created_at)} · {x.dishes_published}/{x.dishes} platillos publicados</p>
        {x.suspension_reason && <p className="text-sm text-red-800">Motivo de suspensión: {x.suspension_reason}</p>}
        <ul className="space-y-1">{x.branches.map(b => <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{b.name} · {b.municipality}</span><Badge tone={STATUS[b.status][1]}>{STATUS[b.status][0]}</Badge>
          {!b.has_location && <Badge tone="amber">Sin ubicación</Badge>}{!b.has_hours && <Badge tone="amber">Sin horario</Badge>}
          {b.status !== 'inactive' && <Button size="sm" variant="outline" className="h-7" onClick={() => setAsk({
            title: `${b.status === 'published' ? 'Despublicar' : 'Publicar'} «${b.name}»`, detail: b.status === 'published' ? 'Deja de aparecer en búsquedas y mapa. El dueño puede volver a publicarla.' : undefined,
            run: act('branch-status', { p_branch_id: b.id, p_publish: b.status !== 'published' }, b.status === 'published' ? 'Sede despublicada.' : 'Sede publicada.'),
          })}>{b.status === 'published' ? 'Despublicar' : 'Publicar'}</Button>}
        </li>)}{x.branches.length === 0 && <li className="text-sm text-muted-foreground">Sin sedes.</li>}</ul>
        <div className="flex flex-wrap gap-2 pt-1">
          {!x.deleted_at && <Button size="sm" variant="outline" onClick={() => setAsk(x.suspended_at
            ? { title: `Levantar la suspensión de «${x.name}»`, detail: 'Las sedes vuelven a borrador; el dueño decide cuándo publicarlas.', run: act('restaurant-suspend', { p_id: x.id, p_suspend: false }, 'Suspensión levantada.') }
            : { title: `Suspender «${x.name}»`, detail: 'Todas sus sedes dejan de verse y el dueño no puede volver a publicarlas hasta que levantes la suspensión.', danger: true, run: act('restaurant-suspend', { p_id: x.id, p_suspend: true }, 'Restaurante suspendido.') })}>
            {x.suspended_at ? 'Levantar suspensión' : 'Suspender'}</Button>}
          {!x.deleted_at && <Button size="sm" variant="outline" onClick={() => setAsk({
            title: `Transferir «${x.name}»`, detail: 'Pasa el restaurante completo (sedes, menú y reseñas) a otra cuenta existente.', input: { label: 'Correo de la cuenta que lo recibe', type: 'email' },
            run: act('restaurant-transfer', { p_id: x.id }, 'Restaurante transferido.'),
          })}>Transferir</Button>}
          <Button size="sm" variant="outline" className={x.deleted_at ? '' : 'text-red-700'} onClick={() => setAsk(x.deleted_at
            ? { title: `Restaurar «${x.name}»`, detail: 'Vuelve a la cuenta del dueño con las sedes en borrador.', run: act('restaurant-delete', { p_id: x.id, p_delete: false }, 'Restaurante restaurado.') }
            : { title: `Eliminar «${x.name}»`, detail: 'Desaparece para todos, también para el dueño. Se puede restaurar desde aquí.', danger: true, confirm: x.name, run: act('restaurant-delete', { p_id: x.id, p_delete: true }, 'Restaurante eliminado.') })}>
            {x.deleted_at ? 'Restaurar' : 'Eliminar'}</Button>
        </div>
      </article>)}</>}</Loading>
  </div>
}

const BAN_OPTIONS: [string, string][] = [['1', '1 día'], ['7', '7 días'], ['30', '30 días'], ['0', 'Indefinida']]
const PROVIDER: Record<string, string> = { email: 'Correo', google: 'Google' }

function UsersTab({ version, setAsk, done, me }: TabProps & { me: string }) {
  const [q, setQ] = useState('')
  const r = useAdmin<User[]>('users', { p_q: q || undefined }, version)
  return <div className="space-y-3">
    <Search value={q} onChange={setQ} placeholder="Buscar por correo o nombre" />
    <Loading {...r}>{list => list.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados.</p> : <>{list.map(u => {
      const banned = !!u.banned_until && new Date(u.banned_until) > new Date()
      const protectedAccount = u.id === me || u.is_admin
      return <article key={u.id} className="space-y-1 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="break-all font-semibold">{u.email}</h3>
          {u.is_admin && <Badge tone="green">Administrador</Badge>}{banned && <Badge tone="red">Suspendida hasta {new Date(u.banned_until!).getFullYear() > 2100 ? 'indefinido' : when(u.banned_until)}</Badge>}
          {!u.confirmed && <Badge tone="amber">Sin confirmar</Badge>}<Badge>{PROVIDER[u.provider ?? ''] ?? u.provider ?? '—'}</Badge></div>
        <p className="text-sm text-muted-foreground">{u.name ? `${u.name} · ` : ''}alta {when(u.created_at)} · último ingreso {when(u.last_sign_in_at)}</p>
        <p className="text-sm text-muted-foreground">{u.restaurants} restaurante(s) · {u.reviews} reseña(s) · {u.favorites} favorito(s)</p>
        {!protectedAccount && <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setAsk(banned
            ? { title: `Reactivar ${u.email}`, run: async reason => { await webApi.admin('user-ban', { p_user_id: u.id, p_days: null, p_reason: reason }); done('Cuenta reactivada.') } }
            : { title: `Suspender ${u.email}`, detail: 'No podrá iniciar sesión y se cierran sus sesiones abiertas (la sesión activa vence en menos de 1 hora).', danger: true, input: { label: 'Duración', options: BAN_OPTIONS },
                run: async (reason, days) => { await webApi.admin('user-ban', { p_user_id: u.id, p_days: Number(days), p_reason: reason }); done('Cuenta suspendida.') } })}>
            {banned ? 'Reactivar' : 'Suspender'}</Button>
          <Button size="sm" variant="outline" onClick={() => setAsk({ title: `Cerrar las sesiones de ${u.email}`, detail: 'Tendrá que iniciar sesión de nuevo en todos sus dispositivos.',
            run: async reason => { await webApi.admin('user-signout', { p_user_id: u.id, p_reason: reason }); done('Sesiones cerradas.') } })}>Cerrar sesiones</Button>
          <Button size="sm" variant="outline" className="text-red-700" onClick={() => setAsk({ title: `Eliminar la cuenta ${u.email}`, danger: true, confirm: u.email,
            detail: 'Borra la cuenta con sus reseñas, favoritos y opinión. No se puede deshacer. Si tiene restaurantes, transfiérelos o elimínalos antes.',
            run: async reason => { await webApi.admin('user-delete', { p_user_id: u.id, p_confirm_email: u.email, p_reason: reason }); done('Cuenta eliminada.') } })}>Eliminar cuenta</Button>
        </div>}
      </article>
    })}</>}</Loading>
  </div>
}

function ReviewsTab({ version, setAsk, done }: TabProps) {
  const [filter, setFilter] = useState<'reported' | 'hidden' | 'all'>('reported')
  const [q, setQ] = useState('')
  const r = useAdmin<Review[]>('reviews', { p_filter: filter, p_q: q || undefined }, version)
  const moderate = (v: Review, action: 'keep' | 'hide' | 'unhide', title: string, text: string) => () => setAsk({ title,
    run: async reason => { await webApi.admin('review-moderate', { p_id: v.id, p_action: action, p_reason: reason }); done(text) } })
  return <div className="space-y-3">
    <div className="flex flex-col gap-2 sm:flex-row">
      <select className="rounded-md border bg-white p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value as typeof filter)} aria-label="Filtro">
        <option value="reported">Reportadas</option><option value="hidden">Ocultas</option><option value="all">Todas</option></select>
      <Search value={q} onChange={setQ} placeholder="Buscar por restaurante, platillo, texto o autor" />
    </div>
    <Loading {...r}>{list => list.length === 0 ? <p className="text-sm text-muted-foreground">No hay reseñas en esta vista.</p> : <>{list.map(v =>
      <article key={v.id} className="space-y-2 rounded-xl border bg-white p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{v.restaurant_name} · {v.dish_name}</span><Stars value={v.rating} />
          {v.hidden_at && <Badge tone="red">Oculta</Badge>}{v.reported_at && !v.hidden_at && <Badge tone="amber">Reportada</Badge>}</p>
        {v.comment ? <p className="whitespace-pre-line text-sm">{v.comment}</p> : <p className="text-sm italic text-muted-foreground">Sin comentario.</p>}
        {v.reply && <p className="border-l-2 border-[#173F35] pl-2 text-sm text-stone-700">Respuesta: {v.reply}</p>}
        <p className="text-xs text-muted-foreground">{v.author_email ?? 'cuenta eliminada'} · {when(v.updated_at)}{v.report_reason ? ` · Motivo del reporte: ${v.report_reason}` : ''}</p>
        <div className="flex flex-wrap gap-2">
          {v.reported_at && !v.hidden_at && <Button size="sm" variant="outline" onClick={moderate(v, 'keep', 'Mantener la reseña (quitar el reporte)', 'Reporte descartado.')}>Mantener</Button>}
          {!v.hidden_at && <Button size="sm" onClick={moderate(v, 'hide', 'Ocultar la reseña', 'Reseña oculta.')}>Ocultar</Button>}
          {v.hidden_at && <Button size="sm" variant="outline" onClick={moderate(v, 'unhide', 'Mostrar la reseña de nuevo', 'Reseña visible de nuevo.')}>Mostrar de nuevo</Button>}
        </div>
      </article>)}</>}</Loading>
  </div>
}

function AdminsTab({ version, setAsk, done, me }: TabProps & { me: string }) {
  const r = useAdmin<Admin[]>('admins', {}, version)
  return <div className="space-y-3">
    <Button size="sm" onClick={() => setAsk({ title: 'Agregar administrador', detail: 'Tendrá control total del panel. La cuenta debe existir y deberá activar la verificación en dos pasos.',
      input: { label: 'Correo de la cuenta', type: 'email' }, danger: true,
      run: async (reason, email) => { await webApi.admin('admin-set', { p_email: email, p_add: true, p_reason: reason }); done('Administrador agregado.') } })}>Agregar administrador</Button>
    <Loading {...r}>{list => <>{list.map(a => <article key={a.user_id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4 text-sm">
      <span className="break-all font-semibold">{a.email}</span>{a.mfa ? <Badge tone="green">Dos pasos activo</Badge> : <Badge tone="amber">Sin dos pasos</Badge>}
      <span className="text-muted-foreground">desde {when(a.since)}</span>
      {a.user_id !== me && <Button size="sm" variant="outline" className="ml-auto text-red-700" onClick={() => setAsk({ title: `Quitar a ${a.email}`, danger: true, confirm: a.email,
        run: async reason => { await webApi.admin('admin-set', { p_email: a.email, p_add: false, p_reason: reason }); done('Administrador quitado.') } })}>Quitar</Button>}
    </article>)}</>}</Loading>
  </div>
}

const ACTION_LABEL: Record<string, string> = {
  'branch.publish': 'Publicó sede', 'branch.unpublish': 'Despublicó sede', 'restaurant.suspend': 'Suspendió restaurante', 'restaurant.unsuspend': 'Levantó suspensión',
  'restaurant.delete': 'Eliminó restaurante', 'restaurant.restore': 'Restauró restaurante', 'restaurant.transfer': 'Transfirió restaurante',
  'user.ban': 'Suspendió cuenta', 'user.unban': 'Reactivó cuenta', 'user.signout': 'Cerró sesiones', 'user.delete': 'Eliminó cuenta',
  'review.keep': 'Mantuvo reseña', 'review.hide': 'Ocultó reseña', 'review.unhide': 'Mostró reseña', 'admin.add': 'Agregó administrador', 'admin.remove': 'Quitó administrador',
}

function AuditTab({ version }: TabProps) {
  const [q, setQ] = useState('')
  const r = useAdmin<AuditEntry[]>('audit', { p_q: q || undefined }, version)
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Registro permanente de cada acción del panel. Nadie puede editarlo ni borrarlo.</p>
    <Search value={q} onChange={setQ} placeholder="Buscar por acción, elemento, administrador o motivo" />
    <Loading {...r}>{list => list.length === 0 ? <p className="text-sm text-muted-foreground">Sin acciones registradas.</p> : <>{list.map(e =>
      <details key={e.id} className="rounded-xl border bg-white p-3 text-sm">
        <summary className="cursor-pointer"><span className="font-semibold">{ACTION_LABEL[e.action] ?? e.action}</span> · {e.target_label ?? e.target_type}
          <span className="text-muted-foreground"> · {when(e.at)} · {e.admin_email}</span></summary>
        <p className="mt-2">Motivo: {e.reason ?? '—'}</p>
        {e.before != null && <pre className="mt-1 overflow-x-auto rounded bg-stone-50 p-2 text-xs">Antes: {JSON.stringify(e.before, null, 1)}</pre>}
        {e.after != null && <pre className="mt-1 overflow-x-auto rounded bg-stone-50 p-2 text-xs">Después: {JSON.stringify(e.after, null, 1)}</pre>}
      </details>)}</>}</Loading>
  </div>
}
