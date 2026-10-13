import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Info } from 'lucide-react'
import { metrics, type Well, type Measurement } from '@/lib/waterflood'

const tooltipStyle = { background:'var(--card)',border:'1px solid var(--border)',borderRadius:6,fontSize:11 }
export function PerformanceChart({ wells, measurements, metric = 'performance' }: { wells: Well[]; measurements: Measurement[]; metric?: 'performance' | 'waterCut' | 'pressure' }) {
  const dates = [...new Set(measurements.filter(m=>wells.some(w=>w.id===m.well_id)).map(m=>m.measurement_date))].sort()
  const points = dates.map(date=>{
    const rows = measurements.filter(m=>m.measurement_date===date && wells.some(w=>w.id===m.well_id))
    const cuts=rows.filter(m=>m.water_cut!=null), pressures=rows.filter(m=>m.pressure!=null)
    return { date: new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), injection:rows.reduce((n,m)=>n+(m.injection_rate??0),0), oil:rows.reduce((n,m)=>n+(m.oil_rate??0),0), waterCut:cuts.length ? cuts.reduce((n,m)=>n+(m.water_cut??0),0)/cuts.length : 0, pressure:pressures.length ? pressures.reduce((n,m)=>n+(m.pressure??0),0)/pressures.length : 0 }
  })
  const series = metric==='performance' ? [{key:'injection',color:'var(--injection)',name:'Water injection'},{key:'oil',color:'var(--oil)',name:'Oil production'}] : [{key:metric,color:metric==='waterCut'?'var(--water)':'var(--injection)',name:metric==='waterCut'?'Water cut':'Injection pressure'}]
  return <>
    <div className="chart-body"><ResponsiveContainer width="100%" height="100%"><AreaChart data={points} margin={{top:10,right:12,left:-15,bottom:5}}><defs><linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={series[0]?.color} stopOpacity={0.12}/><stop offset="100%" stopColor={series[0]?.color} stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 4"/><XAxis dataKey="date" axisLine={false} tickLine={false} dy={8}/><YAxis axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${v/1000}k`:`${v}`}/><Tooltip contentStyle={tooltipStyle}/>{series.map((s,i)=><Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={i===0?`url(#fill-${metric})`:'transparent'} dot={{r:4,fill:s.color,stroke:'var(--card)',strokeWidth:2}} activeDot={{r:6}} isAnimationActive={false}/>)}</AreaChart></ResponsiveContainer></div>
    {points.length<2 && <div className="chart-note"><Info size={11}/> One recorded date · add measurements to build historical trends</div>}
  </>
}
export function FieldProductionChart({ wells }: { wells: Well[] }) {
  const data = [...new Set(wells.map(w=>w.field_name))].map(field=>({name:field.replace(' Field',''),...metrics(wells.filter(w=>w.field_name===field))}))
  return <div className="chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:5,right:10,left:-15,bottom:5}} barGap={5}><CartesianGrid vertical={false} strokeDasharray="3 4"/><XAxis dataKey="name" axisLine={false} tickLine={false} dy={8}/><YAxis axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000}k`}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="injection" name="Injection" fill="var(--injection)" radius={[3,3,0,0]} maxBarSize={22}/><Bar dataKey="oil" name="Oil production" fill="var(--oil)" radius={[3,3,0,0]} maxBarSize={22}/></BarChart></ResponsiveContainer></div>
}
export function WellRateChart({ wells, kind }: { wells:Well[]; kind:'Injector'|'Producer' }) {
  const data=wells.filter(w=>w.well_type===kind).map(w=>({name:w.name,rate:kind==='Injector'?w.injection_rate:w.oil_rate}))
  return <div className="chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}><CartesianGrid horizontal={false} strokeDasharray="3 4"/><XAxis type="number" axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={70}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="rate" name={`${kind==='Injector'?'Injection':'Oil production'} (bbl/d)`} fill={kind==='Injector'?'var(--injection)':'var(--oil)'} radius={[0,3,3,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>
}
export function StatusChart({ wells }: { wells:Well[] }) {
  const data=['Active','Maintenance','Shut-in'].map(status=>({name:status,count:wells.filter(w=>w.status===status).length}))
  return <div className="chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:10,left:-25,bottom:0}}><CartesianGrid vertical={false} strokeDasharray="3 4"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="count" name="Wells" radius={[4,4,0,0]} maxBarSize={45}>{data.map((d,i)=><Cell key={d.name} fill={['var(--oil)','var(--warning)','var(--destructive)'][i]}/>)}</Bar></BarChart></ResponsiveContainer></div>
}