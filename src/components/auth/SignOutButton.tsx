'use client'

import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

type SignOutButtonProps = {
  variant?: 'default' | 'ghost' | 'link' | 'destructive' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean
  className?: string
  redirectUrl?: string
}

export function SignOutButton({
  variant = 'ghost',
  size = 'sm',
  showText = true,
  className,
  redirectUrl = '/sign-in',
}: SignOutButtonProps) {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push(redirectUrl)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      className={className}
    >
      <LogOut className="h-4 w-4" />
      {showText && <span className="ml-2 hidden sm:inline">Sign out</span>}
    </Button>
  )
}
