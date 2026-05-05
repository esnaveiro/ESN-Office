"use client"

import { Button } from "@/components/ui/button"
import { KeyRound, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'esn'

export function ChangePasswordDialog() {
  const router = useRouter()

  if (AUTH_PROVIDER === 'supabase') {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => router.push('/profile?tab=security')}
      >
        <KeyRound className="h-4 w-4 mr-2" />
        Change Password
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={() => window.open('https://accounts.esn.org/user', '_blank', 'noopener')}
    >
      <KeyRound className="h-4 w-4 mr-2" />
      Manage Password
      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
    </Button>
  )
}
