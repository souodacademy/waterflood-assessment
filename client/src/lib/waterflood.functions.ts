import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import type { Role, WorkspaceData } from './waterflood'

export const getWorkspace = createServerFn({ method: 'GET' }).inputValidator((input: { authenticated?: boolean; demoRole?: Role | null } | undefined) => input).handler(async ({data:input}): Promise<WorkspaceData> => {
  const authorization = input?.authenticated ? getRequestHeader('authorization') : undefined
  const dotnetApi = process.env['DOTNET_API_URL'] || process.env['VITE_DOTNET_API_URL']
  if (dotnetApi) {
    const response = await fetch(`${dotnetApi.replace(/\/$/, '')}/api/workspace`, {
      headers: authorization ? { Authorization: authorization } : {},
    })
    if (!response.ok) throw new Error('Unable to load field records from the .NET API.')
    const workspace = await response.json() as WorkspaceData
    return input?.demoRole ? { ...workspace, role: input.demoRole } : workspace
  }
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authorization ? { Authorization: authorization } : {}, fetch: (input,init) => {
      const headers = new Headers(init?.headers)
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization')
      headers.set('apikey',key)
      return fetch(input, { ...init,headers })
    } },
  })
  let role: Role | null = null
  if (authorization) {
    const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer /i,''))
    if (error || !data.user) throw new Error('Please sign in again.')
    const roles = await client.from('user_roles').select('role').eq('user_id',data.user.id)
    role = roles.data?.some(r=>r.role==='admin') ? 'admin' : roles.data?.some(r=>r.role==='engineer') ? 'engineer' : roles.data?.some(r=>r.role==='operator') ? 'operator' : null
  }
  const [wells, relationships, measurements, thresholds, audit] = await Promise.all([
    client.from('wells').select('*').order('name'), client.from('relationships').select('*'), client.from('measurements').select('*').order('measurement_date').limit(10000), client.from('thresholds').select('*').eq('id',1).single(), role ? client.from('audit_log').select('*').order('created_at',{ascending:false}).limit(50) : Promise.resolve({data:[],error:null}),
  ])
  for (const result of [wells,relationships,measurements,thresholds,audit]) if (result.error) throw new Error('Unable to load field records. Please try again.')
  if (!thresholds.data) throw new Error('Alert thresholds are unavailable.')
  return { wells: wells.data ?? [], relationships: relationships.data ?? [], measurements: measurements.data ?? [], thresholds: thresholds.data, role, audit: audit.data ?? [] }
})