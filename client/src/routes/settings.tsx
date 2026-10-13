import { createFileRoute } from '@tanstack/react-router'
import { Workspace, workspaceQuery } from '@/components/waterflood/workspace'
import { pageHead } from '@/lib/page-head'
export const Route=createFileRoute('/settings')({head:()=>pageHead('Performance settings','Configure waterflood alert thresholds and secured operational access.'),loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Settings})
function Settings(){return <Workspace section="settings"/>}