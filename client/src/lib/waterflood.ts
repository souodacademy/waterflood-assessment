import type { Database } from '@/integrations/supabase/types'

export type Well = Database['public']['Tables']['wells']['Row']
export type Relationship = Database['public']['Tables']['relationships']['Row']
export type Measurement = Database['public']['Tables']['measurements']['Row']
export type Thresholds = Database['public']['Tables']['thresholds']['Row']
export type Role = 'operator' | 'engineer' | 'admin'
export type WorkspaceData = { wells: Well[]; relationships: Relationship[]; measurements: Measurement[]; thresholds: Thresholds; role: Role | null; audit: Database['public']['Tables']['audit_log']['Row'][] }
export const number = (value: number | null | undefined, digits = 0) => value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: digits })
export function wellAlerts(well: Well, thresholds: Thresholds, measurements: Measurement[] = []) {
  const alerts: { label: string; severity: 'critical' | 'warning'; detail: string }[] = []
  if (well.well_type === 'Producer') {
    if (well.water_cut != null && well.water_cut > thresholds.water_cut) alerts.push({ label: 'High water cut', severity: 'critical', detail: `${number(well.water_cut)}% · threshold ${thresholds.water_cut}%` })
    if (well.oil_rate != null && well.oil_rate < thresholds.low_oil) alerts.push({ label: 'Low oil production', severity: 'warning', detail: `${number(well.oil_rate)} bbl/d · below ${number(thresholds.low_oil)}` })
    const previous = measurements.filter(m => m.well_id === well.id && m.measurement_date < well.measurement_date && m.oil_rate != null).sort((a,b) => b.measurement_date.localeCompare(a.measurement_date))[0]
    if (previous?.oil_rate && well.oil_rate != null && (previous.oil_rate - well.oil_rate) / previous.oil_rate * 100 > thresholds.decline_pct) alerts.push({ label: 'Production decline', severity: 'critical', detail: `Decline exceeds ${thresholds.decline_pct}% from previous measurement` })
  } else {
    if (well.injection_rate != null && well.injection_rate < thresholds.low_injection) alerts.push({ label: 'Low injection rate', severity: 'warning', detail: `${number(well.injection_rate)} bbl/d · below ${number(thresholds.low_injection)}` })
    if (well.pressure != null && well.pressure > thresholds.high_pressure) alerts.push({ label: 'High injection pressure', severity: 'critical', detail: `${number(well.pressure)} psi · above ${number(thresholds.high_pressure)}` })
  }
  if (well.status !== 'Active') alerts.push({ label: well.status, severity: 'warning', detail: 'Well is not currently active' })
  return alerts
}
export function metrics(wells: Well[]) {
  const producers = wells.filter(w => w.well_type === 'Producer')
  const cuts = producers.filter(w => w.water_cut != null)
  return { injection: wells.reduce((n,w) => n + (w.injection_rate ?? 0),0), oil: wells.reduce((n,w) => n + (w.oil_rate ?? 0),0), water: wells.reduce((n,w) => n + (w.water_rate ?? 0),0), waterCut: cuts.length ? cuts.reduce((n,w) => n + (w.water_cut ?? 0),0)/cuts.length : null, injectors: wells.filter(w => w.well_type === 'Injector' && w.status === 'Active').length, producers: producers.filter(w => w.status === 'Active').length }
}
export type Filters = { field: string; type: string; status: string; metric: 'injection_rate' | 'oil_rate' | 'water_cut' | 'pressure'; comparison: 'above' | 'below'; value: string; from: string; to: string; attention: boolean }
export const emptyFilters: Filters = { field: 'All fields', type: 'All types', status: 'All statuses', metric: 'water_cut', comparison: 'above', value: '', from: '', to: '', attention: false }
export function filterWells(wells: Well[], filters: Filters, thresholds: Thresholds, search = '', measurements: Measurement[] = []) {
  return wells.filter(w => (filters.field === 'All fields' || w.field_name === filters.field) && (filters.type === 'All types' || w.well_type === filters.type) && (filters.status === 'All statuses' || w.status === filters.status) && (!search || `${w.name} ${w.field_name}`.toLowerCase().includes(search.toLowerCase())) && (!filters.from || w.measurement_date >= filters.from) && (!filters.to || w.measurement_date <= filters.to) && (!filters.attention || wellAlerts(w,thresholds,measurements).length > 0) && (filters.value === '' || (w[filters.metric] != null && (filters.comparison === 'above' ? Number(w[filters.metric]) > Number(filters.value) : Number(w[filters.metric]) < Number(filters.value)))))
}