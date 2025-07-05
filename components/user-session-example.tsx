"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updatePaymentSettings, logoutUser } from "@/lib/session-utils"
import { useState } from "react"

export function UserSessionExample() {
  const { data: session, status } = useSession()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdatePayment = async () => {
    if (!session?.user.primaryOrganization) return

    setIsUpdating(true)
    try {
      await updatePaymentSettings(
        session.user.primaryOrganization.id,
        "Enterprise", // Upgrade to Enterprise
        { seats: 50 }
      )
      alert("Payment settings updated successfully!")
    } catch (error) {
      console.error("Failed to update payment:", error)
      alert("Failed to update payment settings")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Not authenticated</div>
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>User Session Information</CardTitle>
        <CardDescription>
          Current user session with payment information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">User Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Name: {session.user.name}</div>
            <div>Email: {session.user.email}</div>
            <div>Verified: {session.user.isEmailVerified ? "Yes" : "No"}</div>
          </div>
        </div>

        {session.user.primaryOrganization && (
          <div>
            <h3 className="font-semibold mb-2">Organization</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Name: {session.user.primaryOrganization.name}</span>
                <Badge variant={session.user.primaryOrganization.accountType === "Premium" ? "default" : "secondary"}>
                  {session.user.primaryOrganization.accountType}
                </Badge>
              </div>
              <div className="text-sm">
                Status: {session.user.primaryOrganization.subscriptionStatus || "No subscription"}
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">Session Info</h3>
          <div className="text-sm space-y-1">
            <div>JWT Token: {session.jwtToken ? "Present" : "Not available"}</div>
            <div>Refresh Token: {session.refreshToken ? "Present" : "Not available"}</div>
            <div>
              Expires: {new Date(session.refreshTokenExpiry).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleUpdatePayment}
            disabled={isUpdating || !session.user.primaryOrganization}
            variant="outline"
          >
            {isUpdating ? "Updating..." : "Upgrade to Enterprise"}
          </Button>
          <Button 
            onClick={handleLogout}
            variant="destructive"
          >
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 