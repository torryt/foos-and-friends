// Sends the requester a "you're in" email when an owner/admin approves their
// join request. Invoked by the client right after approve_join_request succeeds
// (see GroupService.approveJoinRequest) — the Brevo key can never leave the server.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { renderJoinApprovedEmail } from './template.ts'

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

// supabase-js sends apikey + x-client-info on every invoke, so the preflight has
// to allow them or the browser blocks the response before the function runs.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function appUrlFor(sportType: string): string {
  const url =
    sportType === 'chess'
      ? (Deno.env.get('APP_URL_CHESS') ?? 'https://chess-and-friends.pages.dev')
      : (Deno.env.get('APP_URL_FOOSBALL') ?? 'https://app.foosandfriends.com')
  // A configured URL may carry a trailing slash; the caller appends its own path.
  return url.replace(/\/+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const brevoApiKey = Deno.env.get('BREVO_API_KEY')
  if (!brevoApiKey) {
    console.error('BREVO_API_KEY is not configured')
    return json({ error: 'Email is not configured' }, 500)
  }

  let requestId: string
  try {
    const body = await req.json()
    requestId = body?.requestId
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (typeof requestId !== 'string' || requestId.length === 0) {
    return json({ error: 'requestId is required' }, 400)
  }

  // Who is calling? Resolved against the caller's own JWT, never trusted from the body.
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()
  if (callerError || !caller) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: request, error: requestError } = await admin
    .from('group_join_requests')
    .select('id, group_id, user_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    console.error('Failed to load join request', requestError)
    return json({ error: 'Failed to load join request' }, 500)
  }
  // Only ever mail for a request that really is approved — this endpoint reports
  // an approval, it does not perform one.
  if (!request || request.status !== 'approved') {
    return json({ error: 'Join request is not approved' }, 404)
  }

  // The caller must be an owner/admin of the group the request belongs to,
  // otherwise any signed-in user could spam approved requesters.
  const { data: membership } = await admin
    .from('group_memberships')
    .select('role')
    .eq('group_id', request.group_id)
    .eq('user_id', caller.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return json({ error: 'Forbidden' }, 403)
  }

  const { data: group } = await admin
    .from('friend_groups')
    .select('name, sport_type')
    .eq('id', request.group_id)
    .maybeSingle()

  if (!group) return json({ error: 'Group not found' }, 404)

  const { data: requester, error: requesterError } = await admin.auth.admin.getUserById(
    request.user_id,
  )
  const recipientEmail = requester?.user?.email
  if (requesterError || !recipientEmail) {
    console.error('Approved requester has no email', requesterError)
    return json({ error: 'Requester has no email address' }, 422)
  }

  const groupUrl = `${appUrlFor(group.sport_type)}/groups/${request.group_id}`
  const brevoResponse = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: Deno.env.get('BREVO_SENDER_EMAIL') ?? 'no-reply@foosandfriends.com',
        name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Foos & Friends',
      },
      to: [{ email: recipientEmail }],
      subject: `You're in — ${group.name} accepted your request`,
      htmlContent: renderJoinApprovedEmail({ groupName: group.name, groupUrl }),
    }),
  })

  if (!brevoResponse.ok) {
    const detail = await brevoResponse.text()
    console.error('Brevo send failed', brevoResponse.status, detail)
    return json({ error: 'Failed to send email' }, 502)
  }

  return json({ sent: true }, 200)
})
