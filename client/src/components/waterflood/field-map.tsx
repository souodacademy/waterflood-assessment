import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Well, Relationship, Thresholds, Measurement } from '@/lib/waterflood'
import { wellAlerts } from '@/lib/waterflood'

export default function FieldMap({ wells, relationships, thresholds, measurements, onSelect, selectedId }: { wells: Well[]; relationships: Relationship[]; thresholds: Thresholds; measurements: Measurement[]; onSelect: (well: Well)=>void; selectedId?: string | undefined }) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  useEffect(() => {
    let cancelled = false
    let cleanup: (()=>void) | undefined
    import('leaflet').then(L => {
      if (cancelled || !element.current) return
      const instance = L.map(element.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false })
      map.current = instance
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(instance)
      L.control.zoom({position:'bottomright'}).addTo(instance)
      wells.forEach(w => {
        const alerts = wellAlerts(w,thresholds,measurements)
        const icon = L.divIcon({ className:'well-map-icon', html:`<span class="map-pin ${w.well_type === 'Injector' ? 'injector' : 'producer'} ${alerts.length ? 'has-alert' : ''} ${w.id === selectedId ? 'selected' : ''} ${w.status !== 'Active' ? 'inactive' : ''}">${w.well_type === 'Injector' ? '↧' : '↥'}${alerts.length ? '<i>!</i>' : ''}</span>`, iconSize:[30,30], iconAnchor:[15,15] })
        const marker = L.marker([w.latitude,w.longitude],{icon}).addTo(instance)
        const label = document.createElement('span'); label.textContent = `${w.name} · ${w.status}${alerts.length ? ' · Requires attention' : ''}`
        marker.bindTooltip(label,{direction:'top'}).on('click',()=>onSelect(w))
      })
      const css = getComputedStyle(document.documentElement)
      relationships.filter(r=>r.status==='Active').forEach(r => {
        const injector = wells.find(w=>w.id===r.injector_id), producer = wells.find(w=>w.id===r.producer_id)
        if (injector && producer) L.polyline([[injector.latitude,injector.longitude],[producer.latitude,producer.longitude]],{color:css.getPropertyValue('--map-line').trim(),weight:2,dashArray:'5 6',opacity:0.7}).addTo(instance)
      })
      if (wells.length) instance.fitBounds(L.latLngBounds(wells.map(w=>[w.latitude,w.longitude] as [number,number])),{padding:[55,55],maxZoom:14})
      else instance.setView([22,56],6)
      const observer = new ResizeObserver(()=>instance.invalidateSize()); observer.observe(element.current)
      cleanup=()=>{ observer.disconnect(); instance.remove(); map.current=null }
    })
    return ()=>{cancelled=true; cleanup?.()}
  },[wells,relationships,thresholds,measurements,selectedId,onSelect])
  return <div ref={element} className="geographic-map" aria-label="Geographic map of waterflood wells" />
}