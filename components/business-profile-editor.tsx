'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { webApi } from '@/lib/web-api'
import { businessProfileSchema, type BrandImageKind, type OwnedRestaurant } from '@/shared/contracts/restaurants'
import { uploadRestaurantImage } from '@/lib/web-image-upload'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import FoodLoader from './food-loader'
import { t } from '@/shared/i18n'

export default function BusinessProfileEditor({ userId, restaurant, onSaved, onClose }: {
  userId: string; restaurant: OwnedRestaurant; onSaved: (restaurant: OwnedRestaurant) => void; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [images, setImages] = useState<Record<BrandImageKind, string | null>>({ logo: null, cover: null })
  const fileFor = useRef<BrandImageKind>('logo')
  const fileInput = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    webApi.getRestaurant(restaurant.id).then((profile) => {
      if (active) { setName(profile.name); setDescription(profile.description || ''); setCategory(profile.category || ''); setImages({ logo: profile.logo_url, cover: profile.cover_url }); setReady(true) }
    }).catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    webApi.listBusinessTypes().then((rows) => { if (active) setTypes(rows) }).catch(() => {}) // suggestions are optional
    return () => { active = false }
  }, [userId, restaurant.id, retry])

  async function changeImage(kind: BrandImageKind, file: File | null) {
    if (busy) return
    setError(''); setNotice(''); setBusy(true)
    try {
      const url = file ? await uploadRestaurantImage(restaurant.id, kind, file) : (await webApi.removeRestaurantImage(restaurant.id, kind), null)
      setImages((v) => ({ ...v, [kind]: url })); setNotice(file ? (kind === 'logo' ? t('Logo guardado.') : t('Foto guardada.')) : t('Imagen quitada.'))
    } catch (err) { setError(err instanceof Error ? err.message : t('No pudimos guardar la imagen.')) }
    finally { setBusy(false) }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
    const parsed = businessProfileSchema.safeParse({ name, description, category: category || null })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setBusy(true)
    try {
      const saved = await webApi.updateRestaurant(restaurant.id, parsed.data)
      setName(saved.name); setDescription(saved.description || ''); setCategory(saved.category || '')
      onSaved(saved); setNotice(t('Perfil guardado.'))
    } catch (err) { setError(err instanceof Error ? err.message : t('No pudimos guardar el perfil.')) }
    finally { setBusy(false) }
  }

  return <section className="rounded-2xl border bg-white p-5 space-y-4">
    <Button variant="ghost" onClick={onClose} disabled={busy}>{t('← Mis restaurantes')}</Button>
    <h2 className="text-xl font-semibold">{t('Perfil de')} {restaurant.name}</h2>
    <p className="text-sm text-muted-foreground">{t('Presenta tu negocio. El nombre, el tipo, la descripción y las fotos se muestran a los clientes en las sedes publicadas.')}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loading ? <FoodLoader label={t('Cargando perfil…')} /> : !ready ? <Button onClick={() => setRetry((v) => v + 1)}>{t('Reintentar carga')}</Button> :
      <form onSubmit={save} className="space-y-4">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden tabIndex={-1}
          onChange={(e) => { const file = e.target.files?.[0] ?? null; e.target.value = ''; if (file) void changeImage(fileFor.current, file) }} />
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          {(['logo', 'cover'] as const).map((kind) => <div key={kind} className="space-y-2">
            <p className="text-sm font-medium">{kind === 'logo' ? 'Logo' : t('Foto del restaurante')}</p>
            <div className={`flex items-center justify-center overflow-hidden border bg-stone-50 ${kind === 'logo' ? 'h-28 w-28 rounded-full' : 'h-28 w-full rounded-xl'}`}>
              {images[kind] ? <img src={images[kind]!} alt={kind === 'logo' ? t('Logo de {name}', { name }) : t('Foto de {name}', { name })} className="h-full w-full object-cover" />
                : <span className="px-2 text-center text-xs text-muted-foreground">{kind === 'logo' ? t('Sin logo') : t('Fachada, salón o tu mejor platillo')}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { fileFor.current = kind; fileInput.current?.click() }}>{images[kind] ? t('Cambiar') : t('Subir')}</Button>
              {images[kind] && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void changeImage(kind, null)}>{t('Quitar')}</Button>}
            </div>
          </div>)}
        </div>
        <div className="space-y-2"><Label htmlFor="profile-business-name">{t('Nombre comercial')}</Label><Input id="profile-business-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="profile-category">{t('Tipo de negocio')}</Label><Input id="profile-category" list="business-types" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} disabled={busy} placeholder={t('Ej. Pizzería, Pupusería, Cafetería')} autoComplete="off" /><datalist id="business-types">{types.map((t) => <option key={t} value={t} />)}</datalist><p className="text-sm text-muted-foreground">{t('Escribe el tuyo o elige uno de la lista. Buscar «')}{category || 'pizzería'}{t('» mostrará tu restaurante.')}</p></div>
        <div className="space-y-2"><Label htmlFor="profile-description">{t('Descripción del restaurante')}</Label><Textarea id="profile-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={5} disabled={busy} placeholder={t('Ej. Pizzas artesanales al horno de leña desde 2010. Ingredientes frescos, ambiente familiar y servicio a domicilio en la zona.')}/><p className="text-sm text-muted-foreground">{description.length}/2000 caracteres</p></div>
        <Button type="submit" disabled={busy}>{busy ? t('Guardando…') : t('Guardar perfil')}</Button>
      </form>}
  </section>
}
