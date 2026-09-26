import { createClient } from '@supabase/supabase-js'
import type { Business } from './yelp'

export interface EnrollmentInvitation {
  id: string
  token: string
  business_name: string
  yelp_id: string | null
  yelp_data: Record<string, unknown> | null
  category: string
  cities: string[]
  monthly_price: number
  status: 'pending' | 'paid' | 'expired' | 'canceled' | 'trial'
  stripe_session_id: string | null
  stripe_subscription_id: string | null
  curated_business_id: string | null
  created_at: string
  expires_at: string
  canceled_at: string | null
  trial_ends_at: string | null
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export interface CreateInvitationInput {
  businessName: string
  category: string
  cities: string[]
  monthlyPrice: number
  yelpId?: string
  yelpData?: Partial<Business>
}

export async function createInvitation(input: CreateInvitationInput): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase.from('enrollment_invitations').insert({
    business_name: input.businessName,
    yelp_id: input.yelpId || null,
    yelp_data: input.yelpData || null,
    category: input.category,
    cities: input.cities,
    monthly_price: input.monthlyPrice,
  }).select('token').single()

  if (error || !data) throw new Error('Failed to create invitation')
  return data.token
}

export async function getInvitationByToken(token: string): Promise<EnrollmentInvitation | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('enrollment_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null
  return data as EnrollmentInvitation
}

export async function markInvitationPaid(
  token: string,
  sessionId: string,
  subscriptionId: string,
  curatedBusinessId: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase
    .from('enrollment_invitations')
    .update({
      status: 'paid',
      stripe_session_id: sessionId,
      stripe_subscription_id: subscriptionId,
      curated_business_id: curatedBusinessId,
    })
    .eq('token', token)

  if (error) throw error
}

export async function listInvitations(): Promise<EnrollmentInvitation[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('enrollment_invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as EnrollmentInvitation[]
}

export async function listPaidInvitations(): Promise<EnrollmentInvitation[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('enrollment_invitations')
    .select('*')
    .in('status', ['paid', 'canceled'])
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as EnrollmentInvitation[]
}

export async function getInvitationBySubscriptionId(
  subscriptionId: string
): Promise<EnrollmentInvitation | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('enrollment_invitations')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()

  if (error || !data) return null
  return data as EnrollmentInvitation
}

export async function getInvitationById(id: string): Promise<EnrollmentInvitation | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('enrollment_invitations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as EnrollmentInvitation
}

export interface CreateTrialInvitationInput {
  businessName: string
  category: string
  cities: string[]
  trialEndsAt: string | null
  curatedBusinessId: string
  yelpId?: string
  yelpData?: Partial<Business>
}

export async function createTrialInvitation(input: CreateTrialInvitationInput): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.from('enrollment_invitations').insert({
    business_name: input.businessName,
    yelp_id: input.yelpId || null,
    yelp_data: input.yelpData || null,
    category: input.category,
    cities: input.cities,
    monthly_price: 0,
    status: 'trial',
    curated_business_id: input.curatedBusinessId,
    trial_ends_at: input.trialEndsAt,
  })

  if (error) throw error
}

export async function deleteInvitation(id: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('enrollment_invitations').delete().eq('id', id)
  if (error) throw error
}

export async function markInvitationCanceled(id: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase
    .from('enrollment_invitations')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
