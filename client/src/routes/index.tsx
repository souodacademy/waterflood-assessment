import { createFileRoute } from "@tanstack/react-router";
import { Workspace, workspaceQuery } from '@/components/waterflood/workspace';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute("/")({
  head:()=>pageHead('Field overview','Connected field operations, waterflood analytics, geographic well maps and operational alerts.'),
  loader:({context})=>context.queryClient.ensureQueryData(workspaceQuery),
  component: Index,
});
function Index() { return <Workspace/>; }
