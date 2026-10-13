import { createFileRoute } from '@tanstack/react-router'
import { Workspace, workspaceQuery } from '@/components/waterflood/workspace'
import { pageHead } from '@/lib/page-head'
import type { WorkspaceData } from '@/lib/waterflood'
export const Route=createFileRoute('/wells/$wellId')({
  head:({params})=>pageHead(`Well ${params.wellId.slice(-3)} performance`,'Detailed waterflood measurements, historical performance and injector–producer connections.'),
  loader:async({context}):Promise<WorkspaceData>=>context.queryClient.ensureQueryData(workspaceQuery),component:Well,
})
function Well(){const {wellId}=Route.useParams();return <Workspace wellId={wellId}/>}