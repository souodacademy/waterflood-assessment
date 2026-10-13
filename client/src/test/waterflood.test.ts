import { describe,it,expect } from 'vitest'
import { metrics, wellAlerts, filterWells, emptyFilters, type Well, type Thresholds } from '@/lib/waterflood'
const thresholds:Thresholds={id:1,water_cut:80,low_oil:500,low_injection:2000,high_pressure:2500,decline_pct:20}
const base:Well={id:'1',name:'INJ-101',field_name:'North Field',well_type:'Injector',latitude:22,longitude:56,status:'Active',injection_rate:4500,oil_rate:null,water_rate:null,water_cut:null,pressure:2100,measurement_date:'2026-08-01',is_sample:true,updated_at:'2026-08-01'}
const producer:Well={...base,id:'2',name:'PROD-204',well_type:'Producer',injection_rate:null,pressure:null,oil_rate:400,water_rate:2100,water_cut:84}
describe('Waterflood calculations',()=>{
  it('keeps injection and oil separate and excludes null cuts',()=>{expect(metrics([base,producer])).toMatchObject({injection:4500,oil:400,water:2100,waterCut:84,injectors:1,producers:1})})
  it('handles empty selection without fabricating a water cut',()=>{expect(metrics([])).toMatchObject({injection:0,oil:0,waterCut:null})})
  it('flags high water cut and low oil on a producer',()=>{expect(wellAlerts(producer,thresholds).map(a=>a.label)).toEqual(['High water cut','Low oil production'])})
  it('does not flag producer-only null values on injectors',()=>{expect(wellAlerts(base,thresholds)).toHaveLength(0)})
  it('uses strict threshold comparisons',()=>{expect(wellAlerts({...producer,oil_rate:500,water_cut:80},thresholds)).toHaveLength(0)})
  it('shares compound filtering and attention across views',()=>{expect(filterWells([base,producer],{...emptyFilters,type:'Producer',attention:true,metric:'water_cut',comparison:'above',value:'80'},thresholds)).toEqual([producer])})
  it('excludes null measurements from numeric filters',()=>{expect(filterWells([base,producer],{...emptyFilters,metric:'oil_rate',comparison:'below',value:'500'},thresholds)).toEqual([producer])})
  it('calculates production decline from previous measured production',()=>{const previous={id:'m',well_id:producer.id,measurement_date:'2026-07-01',oil_rate:1000,injection_rate:null,water_rate:null,water_cut:null,pressure:null,status:'Active'};expect(wellAlerts(producer,thresholds,[previous]).some(a=>a.label==='Production decline')).toBe(true)})
})