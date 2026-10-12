'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapBranch = { id: string; name: string; branch_name: string; latitude: number | null; longitude: number | null }

const pin = L.divIcon({
  className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -38],
  html: '<svg width="32" height="42" viewBox="0 0 40 52"><path d="M20 50C16 42 2 29 2 20a18 18 0 1 1 36 0c0 9-14 22-18 30Z" fill="#bd481f" stroke="white" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="white"/></svg>',
})

/** All published branches on one map; a pin's popup opens the branch. Names are user content: set as text, never HTML. */
export default function BranchesOverviewMap({ branches, onOpen }: { branches: MapBranch[]; onOpen: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const open = useRef(onOpen)
  open.current = onOpen
  useEffect(() => {
    if (!container.current) return
    // On touch screens one finger scrolls the page, not the map (pinch still zooms).
    const map = L.map(container.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([14.84, -91.52], 12)
    L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    const points: L.LatLngTuple[] = []
    for (const b of branches) {
      if (b.latitude == null || b.longitude == null) continue
      points.push([b.latitude, b.longitude])
      const box = document.createElement('div')
      const title = document.createElement('p'); title.className = 'font-semibold'; title.textContent = b.name
      const sub = document.createElement('p'); sub.className = 'text-xs text-stone-600'; sub.textContent = b.branch_name
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Ver sede'
      button.className = 'mt-2 rounded-md bg-[#173F35] px-3 py-1 text-sm text-white'
      button.onclick = () => open.current(b.id)
      box.append(title, sub, button)
      L.marker([b.latitude, b.longitude], { icon: pin, title: b.name, alt: b.name }).bindPopup(box).addTo(map)
    }
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 15 })
    else if (points.length === 1) map.setView(points[0], 15)
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(container.current)
    return () => { resize.disconnect(); map.remove() }
  }, [branches])
  return <div ref={container} aria-label="Mapa de restaurantes registrados" className="relative z-0 h-80 w-full rounded-2xl border" />
}
