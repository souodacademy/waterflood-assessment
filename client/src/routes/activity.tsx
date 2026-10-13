import { createFileRoute } from '@tanstack/react-router'
import { Workspace, workspaceQuery } from '@/components/waterflood/workspace'
import { pageHead } from '@/lib/page-head'
export const Route=createFileRoute('/activity')({head:()=>pageHead('Operational activity','Waterflood measurement and well record audit history.'),loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),component:Activity})
function Activity(){return <Workspace section="activity"/>}