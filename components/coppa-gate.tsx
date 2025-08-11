'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, Users, Heart, Lock } from 'lucide-react'

interface CoppaGateProps {
  onContinue: (mode: 'anonymous' | 'parent') => void
}

export function CoppaGate({ onContinue }: CoppaGateProps) {
  const [showParentInfo, setShowParentInfo] = useState(false)

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 text-center">
        {/* Logo and Title */}
        <div className="mb-8">
          <div className="mx-auto mb-4 h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to PixelBuddy!</h1>
          <p className="text-lg text-gray-600">A safe, fun pixel art studio for kids</p>
        </div>

        {!showParentInfo ? (
          <>
            {/* Age-appropriate message */}
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="flex items-center space-x-2 text-green-600">
                  <Shield className="h-6 w-6" />
                  <span className="font-medium">Safe & Private</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-600">
                  <Lock className="h-6 w-6" />
                  <span className="font-medium">No Personal Info</span>
                </div>
                <div className="flex items-center space-x-2 text-purple-600">
                  <Heart className="h-6 w-6" />
                  <span className="font-medium">Kid-Friendly</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Choose Your Mode:</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                    <h3 className="font-semibold text-green-700 mb-2">🎨 Local Mode (Recommended)</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ Works offline on your computer</li>
                      <li>✅ No personal information needed</li>
                      <li>✅ All your art stays on your device</li>
                      <li>✅ Perfect for kids under 13</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <h3 className="font-semibold text-blue-700 mb-2">☁️ Cloud Mode</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ Save projects online</li>
                      <li>✅ Access from any device</li>
                      <li>⚠️ Requires parent permission</li>
                      <li>⚠️ For 13+ or with parent approval</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => onContinue('anonymous')}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 text-lg"
              >
                🎨 Start Creating (Local Mode)
              </Button>
              
              <Button
                onClick={() => setShowParentInfo(true)}
                variant="outline"
                size="lg"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold py-4 text-lg"
              >
                <Users className="mr-2 h-5 w-5" />
                Parent/Teacher Mode
              </Button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>PixelBuddy is COPPA compliant and designed with kids' privacy in mind.</p>
              <p>Local mode requires no personal information and keeps all data on your device.</p>
            </div>
          </>
        ) : (
          <>
            {/* Parent/Teacher Information */}
            <div className="text-left space-y-6">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-800">Parent/Teacher Mode</h2>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">Cloud Features Include:</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>✅ Save and sync projects across devices</li>
                  <li>✅ Share projects with classmates and teachers</li>
                  <li>✅ Access to premium AI features</li>
                  <li>✅ Classroom management tools</li>
                  <li>✅ Export to multiple formats</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="font-semibold text-amber-800 mb-3">⚠️ COPPA Compliance Notice</h3>
                <div className="space-y-3 text-sm text-amber-700">
                  <p>
                    <strong>For children under 13:</strong> Parental consent is required to use cloud features. 
                    We collect minimal information (email for account creation only) and never share personal data.
                  </p>
                  <p>
                    <strong>For ages 13+:</strong> You may create an account with parental guidance.
                  </p>
                  <p>
                    <strong>For teachers:</strong> Institutional email addresses can be used to create classroom accounts.
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 mb-3">🔒 Privacy Commitments</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• No personal information beyond email is collected</li>
                  <li>• No advertising or tracking cookies</li>
                  <li>• No social features or public profiles</li>
                  <li>• Data is encrypted and stored securely</li>
                  <li>• Easy account deletion at any time</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <Button
                onClick={() => setShowParentInfo(false)}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => onContinue('parent')}
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Continue as Parent/Teacher
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}