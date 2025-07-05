import { getSession, signOut } from "next-auth/react"

// Function to refresh session with updated payment info
export async function refreshSessionWithPaymentInfo() {
  try {
    // Get current session
    const session = await getSession()
    if (session) {
      // Force session refresh by calling the API
      const response = await fetch("/api/auth/session", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (response.ok) {
        // Get the updated session
        return await getSession()
      }
    }
    return null
  } catch (error) {
    console.error("Failed to refresh session:", error)
    return null
  }
}

// Function to update user payment settings
export async function updatePaymentSettings(organizationId: string, accountType: string, subscriptionData?: any) {
  try {
    const response = await fetch("/api/v1/payment/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationId,
        accountType,
        subscriptionData
      }),
    })

    const data = await response.json()
    
    if (data.success) {
      // Refresh the session to get updated payment info
      await refreshSessionWithPaymentInfo()
      return data
    } else {
      throw new Error(data.message || "Failed to update payment settings")
    }
  } catch (error) {
    console.error("Payment update error:", error)
    throw error
  }
}

// Function to get payment settings
export async function getPaymentSettings(organizationId: string) {
  try {
    const response = await fetch(`/api/v1/payment/update?organizationId=${organizationId}`, {
      method: "GET",
    })

    const data = await response.json()
    
    if (data.success) {
      return data.data
    } else {
      throw new Error(data.message || "Failed to get payment settings")
    }
  } catch (error) {
    console.error("Payment settings retrieval error:", error)
    throw error
  }
}

// Function to logout user
export async function logoutUser() {
  try {
    // Call our custom logout API first
    await fetch("/api/v1/logout", {
      method: "POST",
    })
    
    // Then use NextAuth signOut
    await signOut({
      callbackUrl: "/login",
      redirect: true
    })
  } catch (error) {
    console.error("Logout error:", error)
    // Fallback to NextAuth signOut
    await signOut({
      callbackUrl: "/login",
      redirect: true
    })
  }
}

// Function to refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken
      }),
    })

    const data = await response.json()
    
    if (data.success) {
      return data.data
    } else {
      throw new Error(data.message || "Failed to refresh token")
    }
  } catch (error) {
    console.error("Token refresh error:", error)
    throw error
  }
}

// Function to get fresh session data
export async function getFreshSessionData() {
  try {
    const response = await fetch("/api/v1/auth/refresh", {
      method: "GET",
    })

    const data = await response.json()
    
    if (data.success) {
      return data.data
    } else {
      throw new Error(data.message || "Failed to get fresh session data")
    }
  } catch (error) {
    console.error("Fresh session data retrieval error:", error)
    throw error
  }
}

// Function to validate session
export async function validateSession() {
  try {
    const session = await getSession()
    if (!session) {
      return { isValid: false, error: "No session found" }
    }
    
    // Check if session is expired
    if (session.refreshTokenExpiry && Date.now() > session.refreshTokenExpiry) {
      return { isValid: false, error: "Session expired" }
    }
    
    return { isValid: true, session }
  } catch (error) {
    console.error("Session validation error:", error)
    return { isValid: false, error: "Session validation failed" }
  }
} 