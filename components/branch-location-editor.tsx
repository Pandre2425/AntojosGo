'use client'
import dynamic from 'next/dynamic'
import { useRef, useState, type FormEvent } from 'react'
import { branchLocationSchema, type BranchLocation, type RestaurantBranch } from '@/shared/contracts/branches'
import { webApi } from '@/lib/web-api'
import ModuleBoundary from './module-boundary'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import FoodLoader from './food-loader'
import { t, msg } from '@/shared/i18n'
const BranchMap = dynamic(() => import('./branch-map'), { ssr: false, loading: () => <FoodLoader label={t('Cargando mapa…')} /> })

export default function BranchLocationEditor({ branch, onSaved, onClose }: { branch: RestaurantBranch; onSaved: (branch: RestaurantBranch) => void; onClose: () => void }) {
  const initial = branch.latitude !== null && branch.longitude !== null ? { latitude: branch.latitude, longitude: branch.longitude } : null
  const [point, setPoint] = useState<BranchLocation | null>(initial)
  const [latitude, setLatitude] = useState(initial ? String(initial.latitude) : '')
  const [longitude, setLongitude] = useState(initial ? String(initial.longitude) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  function select(value: BranchLocation) {
    setPoint(value); setLatitude(String(value.latitude)); setLongitude(String(value.longitude)); setError('')
  }
  const [locating, setLocating] = useState(false)
  // Most precise when the owner is at the entrance (tablet/phone). Needs HTTPS or localhost.
  function pickCurrentLocation() {
    if (!navigator.geolocation) { setError(t('Este navegador no permite obtener la ubicación. Mueve el mapa o escribe las coordenadas.')); return }
    setLocating(true); setError('')
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); select({ latitude: p.coords.latitude, longitude: p.coords.longitude }) },
      () => { setLocating(false); setError(t('No pudimos obtener tu ubicación. Revisa el permiso del navegador o mueve el mapa.')) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    const parsed = branchLocationSchema.safeParse({ latitude: latitude.trim() ? Number(latitude) : NaN, longitude: longitude.trim() ? Number(longitude) : NaN })
    if (!parsed.success) { setError(t('Selecciona un punto o escribe coordenadas válidas.')); return }
    saving.current = true; setBusy(true); setError('')
    try { onSaved(await webApi.saveLocation(branch.id, parsed.data)) }
    catch (err) { setError(err instanceof Error ? err.message : t('No pudimos guardar la ubicación.')) }
    finally { saving.current = false; setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-4 border-t pt-4">
    <h4 className="font-semibold">{t('Ubicación de')} {branch.name}</h4>
    <fieldset disabled={busy} className="space-y-4">
      <div inert={busy}><ModuleBoundary name={msg('el mapa')}><BranchMap value={point} onChange={select} /></ModuleBoundary></div>
      <Button type="button" variant="outline" disabled={locating} onClick={pickCurrentLocation}>{locating ? t('Buscando ubicación…') : t('Usar mi ubicación actual')}</Button>
      <p role="status" className="text-sm">{point ? t('Punto seleccionado. Ajusta el mapa y confirma la ubicación.') : t('Mueve el mapa para seleccionar la ubicación de tu restaurante.')}</p>
      <details><summary className="cursor-pointer text-sm underline">Introducir coordenadas manualmente (opcional)</summary>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor={`lat-${branch.id}`}>{t('Latitud')}</Label><Input id={`lat-${branch.id}`} type="number" step="any" min={-90} max={90} value={latitude} onChange={(e) => setLatitude(e.target.value)} /></div>
        <div><Label htmlFor={`lng-${branch.id}`}>{t('Longitud')}</Label><Input id={`lng-${branch.id}`} type="number" step="any" min={-180} max={180} value={longitude} onChange={(e) => setLongitude(e.target.value)} /></div>
      </div>
      <Button type="button" variant="outline" onClick={() => {
        const parsed = branchLocationSchema.safeParse({ latitude: latitude.trim() ? Number(latitude) : NaN, longitude: longitude.trim() ? Number(longitude) : NaN })
        if (parsed.success) select(parsed.data)
        else setError(t('Escribe ambas coordenadas dentro de sus rangos válidos.'))
      }}>{t('Ver coordenadas en el mapa')}</Button></details>
      <p className="text-sm text-muted-foreground">{t('Confirma que el pin señala la entrada correcta. La ubicación se guarda para esta sede.')}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit">{busy ? t('Guardando…') : t('Confirmar y guardar ubicación')}</Button><Button type="button" variant="outline" onClick={onClose}>{t('Cancelar')}</Button></div>
    </fieldset>
  </form>
}
