import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, ChevronRight, TriangleAlert, GitBranch, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { number, wellAlerts, type Well, type WorkspaceData } from '@/lib/waterflood'

export function WellTable({ wells, data, title = 'Well explorer' }: { wells:Well[]; data:WorkspaceData; title?:string }) {
  const [tree,setTree]=useState(true)
  const [collapsed,setCollapsed]=useState<string[]>([])
  const [page,setPage]=useState(1)
  const fields=[...new Set(wells.map(w=>w.field_name))]
  const toggle=(id:string)=>setCollapsed(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
  const renderWell=(w:Well,child=false)=>{
    const alerts=wellAlerts(w,data.thresholds,data.measurements)
    const relations=data.relationships.filter(r=>r.injector_id===w.id && wells.some(p=>p.id===r.producer_id))
    return <tr key={`${w.id}-${child}`} className={child?'producer-child':''}>
      <td><div className="well-link">{child && <span className="tree-elbow">└</span>}{tree && w.well_type==='Injector' && relations.length>0 ? <Button size="icon" variant="ghost" className="h-5 w-5" aria-label={`${collapsed.includes(w.id)?'Expand':'Collapse'} ${w.name}`} onClick={()=>toggle(w.id)}>{collapsed.includes(w.id)?<ChevronRight size={12}/>:<ChevronDown size={12}/>}</Button>:<span className={`well-glyph ${w.well_type==='Injector'?'injector':''}`}>{w.well_type==='Injector'?<ArrowDownToLine size={12}/>:<ArrowUpFromLine size={12}/>}</span>}<Link to="/wells/$wellId" params={{wellId:w.id}}>{w.name}</Link></div></td>
      <td><span className="well-type"><span className={`legend-dot ${w.well_type==='Injector'?'injection':'oil'}`}/>{w.well_type}</span></td>
      {!tree && <td>{w.field_name}</td>}
      <td>{number(w.injection_rate)}</td><td>{number(w.oil_rate)}</td><td>{number(w.water_rate)}</td><td>{w.water_cut!=null?`${number(w.water_cut)}%`:'—'}</td><td>{number(w.pressure)}</td>
      <td><span className={`status-pill ${w.status!=='Active'?'inactive':''}`}><span className="legend-dot"/>{w.status}</span></td>
      <td>{alerts.length ? <Link to="/wells/$wellId" params={{wellId:w.id}} className={`alert-tag ${alerts[0]?.severity==='warning'?'warning':''}`}><TriangleAlert size={10}/>{alerts[0]?.label}{alerts.length>1?` +${alerts.length-1}`:''}</Link>:<span className="text-muted-foreground flex items-center gap-1 text-[9px]"><Check size={11}/>Normal</span>}</td>
      <td><Link to="/wells/$wellId" params={{wellId:w.id}} aria-label={`View ${w.name}`}><ChevronRight size={13}/></Link></td>
    </tr>
  }
  const associated = new Set(data.relationships.filter(r=>wells.some(w=>w.id===r.injector_id)).map(r=>r.producer_id))
  return <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">{title}<span className="text-muted-foreground font-normal text-[10px]">{wells.length} wells</span></h2><p className="panel-subtitle">Injection, production & operational health</p></div><div className="flex items-center gap-1"><Button variant={tree?'secondary':'ghost'} size="sm" onClick={()=>{setTree(true);setPage(1)}} title="Field and injector tree"><GitBranch/>Tree</Button><Button variant={!tree?'secondary':'ghost'} size="sm" onClick={()=>{setTree(false);setPage(1)}} title="Flat well list"><List/>List</Button></div></div><div className="data-table-scroll"><table className="data-table"><thead><tr><th>Well name</th><th>Type</th>{!tree&&<th>Field</th>}<th>Injection <small>bbl/d</small></th><th>Oil <small>bbl/d</small></th><th>Water <small>bbl/d</small></th><th>Water cut</th><th>Pressure <small>psi</small></th><th>Status</th><th>Health</th><th/></tr></thead><tbody>{tree?fields.flatMap(field=>{
    const fieldWells=wells.filter(w=>w.field_name===field)
    return [<tr key={field} className="field-row"><td colSpan={10}><Button variant="ghost" size="sm" className="h-5 px-0" onClick={()=>toggle(field)}>{collapsed.includes(field)?<ChevronRight size={12}/>:<ChevronDown size={12}/>}<Link to="/fields/$fieldId" params={{fieldId:field.toLowerCase().replace(' field','')}} onClick={e=>e.stopPropagation()}>{field}</Link><span className="text-muted-foreground text-[9px] font-normal ml-2">{fieldWells.length} wells</span></Button></td></tr>,...(!collapsed.includes(field)?fieldWells.filter(w=>w.well_type==='Injector'||!associated.has(w.id)).flatMap(w=>[renderWell(w),...(w.well_type==='Injector'&&!collapsed.includes(w.id)?data.relationships.filter(r=>r.injector_id===w.id).flatMap(r=>{const p=fieldWells.find(x=>x.id===r.producer_id);return p?[renderWell(p,true)]:[]}):[])]):[])]
  }):wells.slice((page-1)*10,page*10).map(w=>renderWell(w))}</tbody></table>{!wells.length&&<div className="empty-state">No wells match these filters.</div>}</div><div className="table-footer"><span>{tree?'Grouped by field → injector → associated producers':`Showing ${wells.length?((page-1)*10+1):0}–${Math.min(page*10,wells.length)} of ${wells.length} wells`}</span><div className="flex items-center gap-2"><span>Measurements · {wells[0]?.measurement_date??'—'}</span>{!tree&&wells.length>10&&<><Button size="icon" variant="ghost" disabled={page===1} onClick={()=>setPage(page-1)} aria-label="Previous page"><ChevronRight className="rotate-180"/></Button><Button size="icon" variant="ghost" disabled={page*10>=wells.length} onClick={()=>setPage(page+1)} aria-label="Next page"><ChevronRight/></Button></>}</div></div></section>
}