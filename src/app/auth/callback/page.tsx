import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>
}

export default async function CallbackPage({ searchParams }: Props) {
  const params = await searchParams

  if (params.error) {
    redirect(`/auth/login?error=${encodeURIComponent(params.error)}`)
  }

  if (!params.code) {
    redirect('/auth/login?error=invalid_callback')
  }

  const query = new URLSearchParams()
  query.set('code', params.code)
  if (params.state) query.set('state', params.state)

  redirect(`/api/auth/callback?${query}`)
}
