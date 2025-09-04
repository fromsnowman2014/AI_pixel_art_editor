'use client'

import React from 'react'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@radix-ui/react-dropdown-menu'
import { LogIn, LogOut, User, Cloud } from 'lucide-react'

export function AuthButton() {
  const { data: session, status } = useSession()
  const { user, setAuthenticatedUser, logout, initializeUser } = useAuthStore()

  React.useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setAuthenticatedUser(session.user)
    } else if (status === 'unauthenticated') {
      initializeUser()
    }
  }, [session, status, setAuthenticatedUser, initializeUser])

  if (status === 'loading') {
    return (
      <Button variant="ghost" size="sm" disabled>
        <User className="w-4 h-4" />
      </Button>
    )
  }

  if (session?.user && status === 'authenticated') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            {session.user?.image ? (
              <Image 
                src={session.user.image} 
                alt="Profile" 
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {session.user?.name || 'User'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled>
            <Cloud className="w-4 h-4 mr-2" />
            Cloud Save Enabled
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Tooltip content="Sign in to save projects to the cloud">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => signIn()}
        className="gap-2"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    </Tooltip>
  )
}