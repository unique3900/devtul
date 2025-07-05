# Authentication System Documentation

## Overview

This authentication system is built with NextAuth.js, implementing comprehensive session management with payment information, refresh token rotation, and seamless user experience.

## Features

✅ **NextAuth.js Integration**: Secure authentication with JWT tokens  
✅ **Bcrypt Password Hashing**: Secure password storage  
✅ **Session Management**: Persistent sessions with automatic refresh  
✅ **Payment Integration**: Account type and subscription info in sessions  
✅ **Refresh Token Rotation**: Automatic token renewal every 12 hours  
✅ **Account Locking**: Protection against brute force attacks  
✅ **Premium by Default**: New users get Premium accounts  
✅ **Payment Updates**: Update account type without logout/login  
✅ **Comprehensive APIs**: Login, logout, refresh, and payment endpoints  

## Environment Variables

Add these to your `.env.local` file:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here

# Database (already configured)
NEXT_PUBLIC_DATABASE_URL=your-database-url
```

## API Endpoints

### Authentication
- `POST /api/v1/login` - User login
- `GET /api/v1/login` - Get session info
- `POST /api/v1/logout` - User logout
- `POST /api/v1/signup` - User registration (sets Premium by default)

### Token Management
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/refresh` - Get fresh session data

### Payment Management
- `POST /api/v1/payment/update` - Update payment settings
- `GET /api/v1/payment/update?organizationId=xxx` - Get payment settings

### NextAuth Routes
- `GET/POST /api/auth/[...nextauth]` - NextAuth handlers
- `GET/POST /api/auth/session` - Session management

## Usage Examples

### 1. Using Session in Components

```tsx
"use client"

import { useSession } from "next-auth/react"

export function MyComponent() {
  const { data: session, status } = useSession()

  if (status === "loading") return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>

  return (
    <div>
      <h1>Welcome {session.user.name}!</h1>
      <p>Account Type: {session.user.primaryOrganization?.accountType}</p>
      <p>Subscription: {session.user.primaryOrganization?.subscriptionStatus}</p>
    </div>
  )
}
```

### 2. Updating Payment Settings

```tsx
import { updatePaymentSettings } from "@/lib/session-utils"

const handleUpgrade = async () => {
  try {
    await updatePaymentSettings(
      organizationId,
      "Enterprise",
      { seats: 50 }
    )
    // Session automatically refreshes with new payment info
  } catch (error) {
    console.error("Upgrade failed:", error)
  }
}
```

### 3. Logout Function

```tsx
import { logoutUser } from "@/lib/session-utils"

const handleLogout = async () => {
  await logoutUser() // Cleans up tokens and redirects
}
```

### 4. Server-Side Session

```tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function MyServerComponent() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return <div>Not authenticated</div>
  }

  return <div>Server-side authenticated content</div>
}
```

## Session Data Structure

```typescript
interface Session {
  user: {
    id: string
    email: string
    name: string
    firstName?: string
    lastName?: string
    avatar?: string
    isEmailVerified: boolean
    organizations: Array<{
      id: string
      name: string
      role: string
      slug: string
      accountType: string
      subscriptionStatus: string | null
    }>
    primaryOrganization: {
      id: string
      name: string
      accountType: string
      subscriptionStatus: string | null
    } | null
  }
  refreshTokenExpiry: number
  jwtToken: string
  refreshToken: string
}
```

## Security Features

### Password Security
- Bcrypt hashing with 12 rounds
- No plain text storage

### Account Protection
- Failed login attempt tracking
- Account locking after 5 failed attempts
- 30-minute lockout period

### Token Security
- JWT tokens with 24-hour expiration
- Refresh token rotation every 12 hours
- Secure token cleanup on logout

### Session Security
- Automatic session cleanup
- Database-backed session management
- Secure cookie handling

## Implementation Notes

### User Registration
- All new users get Premium accounts by default
- Organization subscriptions created automatically
- Email verification status tracked

### Payment Updates
- Account type changes without logout/login
- Session refresh after payment updates
- Permission-based access control

### Token Management
- Automatic refresh token rotation
- Database cleanup on logout
- Expired token handling

## Troubleshooting

### Common Issues

1. **Session Not Found**
   - Check NEXTAUTH_SECRET environment variable
   - Verify database connection
   - Check if user is active

2. **Payment Updates Not Reflected**
   - Ensure session refresh is called
   - Check organization membership permissions
   - Verify subscription status

3. **Logout Issues**
   - Clear browser cookies
   - Check database token cleanup
   - Verify API endpoint access

### Debug Tips

```typescript
// Check session status
console.log("Session:", session)
console.log("Status:", status)

// Check token expiry
console.log("Token expires:", new Date(session?.refreshTokenExpiry))

// Check payment info
console.log("Account type:", session?.user.primaryOrganization?.accountType)
```

## Component Usage

Use the provided `UserSessionExample` component to see all features in action:

```tsx
import { UserSessionExample } from "@/components/user-session-example"

export default function DashboardPage() {
  return (
    <div>
      <UserSessionExample />
    </div>
  )
}
```

## Migration Notes

The system automatically handles:
- User account upgrades
- Session data migration
- Token rotation
- Payment status updates

No manual intervention required for existing users. 