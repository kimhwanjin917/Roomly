import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrgDashboard from './OrgDashboard'

export const dynamic = 'force-dynamic'

export default async function OrgPage({ params }: { params: { orgId: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.app_metadata?.role as string | undefined
  const sessionOrgId = user.app_metadata?.org_id as string | undefined

  // org_admin 전용 + 세션 org_id와 URL org_id 일치 필수
  if (role !== 'org_admin' || !sessionOrgId || sessionOrgId !== params.orgId) {
    redirect('/login')
  }

  const service = createServiceClient()
  const { data: org } = await service
    .from('organizations')
    .select('name')
    .eq('id', params.orgId)
    .single()

  if (!org) redirect('/login')

  return <OrgDashboard orgName={org.name} />
}
