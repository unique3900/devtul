"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      })
      
      if (result?.error) {
        console.error("Login failed:", result.error)
        alert("Login failed: " + result.error)
      } else {
        console.log("Login successful")
        alert("Login successful!")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Login error: " + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      {!session ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Login Test</CardTitle>
            <CardDescription>
              Test the authentication system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Authentication Success!</CardTitle>
            <CardDescription>
              You are logged in. Here's your session data:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><strong>ID:</strong> {session.user.id}</div>
                <div><strong>Email:</strong> {session.user.email}</div>
                <div><strong>Name:</strong> {session.user.name}</div>
                <div><strong>Email Verified:</strong> {session.user.isEmailVerified ? "Yes" : "No"}</div>
              </div>
            </div>

            {session.user.primaryOrganization && (
              <div>
                <h3 className="font-semibold mb-2">Primary Organization</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm"><strong>Name:</strong> {session.user.primaryOrganization.name}</span>
                    <Badge variant={session.user.primaryOrganization.accountType === "Premium" ? "default" : "secondary"}>
                      {session.user.primaryOrganization.accountType}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <strong>Subscription Status:</strong> {session.user.primaryOrganization.subscriptionStatus || "No subscription"}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Session Details</h3>
              <div className="text-sm space-y-1">
                <div><strong>JWT Token:</strong> {session.jwtToken ? "Present" : "Not available"}</div>
                <div><strong>Refresh Token:</strong> {session.refreshToken ? "Present" : "Not available"}</div>
                <div><strong>Token Expires:</strong> {new Date(session.refreshTokenExpiry).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Organizations</h3>
              <div className="space-y-2">
                {session.user.organizations.map((org) => (
                  <div key={org.id} className="flex items-center gap-2 text-sm">
                    <span>{org.name}</span>
                    <Badge variant="outline">{org.role}</Badge>
                    <Badge variant="secondary">{org.accountType}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleSignOut} variant="destructive">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 