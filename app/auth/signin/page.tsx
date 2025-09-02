'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chrome, Facebook, Github } from 'lucide-react'

type Provider = {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

const providerIcons = {
  google: Chrome,
  facebook: Facebook,
  github: Github,
}

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      const providers = await getProviders()
      setProviders(providers)
    }
    fetchProviders()
  }, [])

  const handleSignIn = (providerId: string) => {
    signIn(providerId, { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to PixelBuddy! 🎨
          </h1>
          <p className="text-gray-600">
            Sign in to save your pixel art to the cloud
          </p>
        </div>

        <div className="space-y-4">
          {providers && Object.values(providers).map((provider) => {
            const IconComponent = providerIcons[provider.id as keyof typeof providerIcons]
            
            return (
              <Button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                variant="outline"
                className="w-full h-12 text-left justify-start gap-3 hover:bg-gray-50"
              >
                {IconComponent && <IconComponent className="w-5 h-5" />}
                Sign in with {provider.name}
              </Button>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            By signing in, you agree to save up to 3 projects in the cloud.
            <br />
            Your art stays private and secure.
          </p>
        </div>
      </div>
    </div>
  )
}