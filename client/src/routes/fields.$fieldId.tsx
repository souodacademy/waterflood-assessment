import { createFileRoute } from '@tanstack/react-router'
import { Workspace, workspaceQuery } from '@/components/waterflood/workspace'
import { pageHead } from '@/lib/page-head'
export const Route=createFileRoute('/fields/$fieldId')({
  head:({params})=>pageHead(`${params.fieldId.charAt(0).toUpperCase()+params.fieldId.slice(1)} Field operations`,'Explore field wells, injection patterns, associated producers and operational performance.'),
  loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Field,
})
function Field(){const {fieldId}=Route.useParams();return <Workspace fieldId={fieldId}/>}