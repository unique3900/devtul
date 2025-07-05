import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { JWT } from "next-auth/jwt"
import { Session } from "next-auth"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import db from "@/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email with organizations and payment info
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: {
              organizationMemberships: {
                include: {
                  organization: {
                    include: {
                      organizationSubscriptions: {
                        where: {
                          status: "Active"
                        },
                        take: 1
                      }
                    }
                  }
                }
              }
            }
          })

          if (!user || !user.password) {
            return null
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("Account is locked due to too many failed login attempts")
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          
          if (!isPasswordValid) {
            // Increment login attempts
            await db.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: { increment: 1 },
                lockedUntil: user.loginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : undefined // Lock for 30 minutes after 5 failed attempts
              }
            })
            return null
          }

          // Check if user is active
          if (!user.isActive) {
            throw new Error("Account is deactivated")
          }

          // Get primary organization and payment info
          const primaryOrg = user.organizationMemberships[0]?.organization
          const subscription = primaryOrg?.organizationSubscriptions[0]

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            avatar: user.avatar || undefined,
            isEmailVerified: user.isEmailVerified,
            organizations: user.organizationMemberships.map(membership => ({
              id: membership.organization.id,
              name: membership.organization.name,
              role: membership.role,
              slug: membership.organization.slug,
              accountType: membership.organization.accountType,
              subscriptionStatus: membership.organization.organizationSubscriptions[0]?.status || null
            })),
            primaryOrganization: primaryOrg ? {
              id: primaryOrg.id,
              name: primaryOrg.name,
              accountType: primaryOrg.accountType,
              subscriptionStatus: subscription?.status || null
            } : null
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
    secret: process.env.NEXTAUTH_SECRET,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.avatar = user.avatar
        token.isEmailVerified = user.isEmailVerified
        token.organizations = user.organizations
        token.primaryOrganization = user.primaryOrganization
        token.refreshTokenExpiry = Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        token.jwtToken = generateJWTToken(user.id, user.email)
        
        // Generate and store refresh token
        const refreshToken = generateRefreshToken()
        token.refreshToken = refreshToken
        
        // Update user's refresh token in database
        await db.user.update({
          where: { id: user.id },
          data: { 
            refreshToken: refreshToken,
            refreshTokenExpiry: new Date(token.refreshTokenExpiry),
            lastLoginAt: new Date(),
            loginAttempts: 0 // Reset login attempts on successful login
          }
        })
      }

      // Handle session update
      if (trigger === "update" && session) {
        // Refresh user data from database
        if (session.refreshPaymentInfo) {
          try {
            const updatedUser = await db.user.findUnique({
              where: { id: token.id as string },
              include: {
                organizationMemberships: {
                  include: {
                    organization: {
                      include: {
                        organizationSubscriptions: {
                          where: {
                            status: "Active"
                          },
                          take: 1
                        }
                      }
                    }
                  }
                }
              }
            })

            if (updatedUser) {
              const primaryOrg = updatedUser.organizationMemberships[0]?.organization
              const subscription = primaryOrg?.organizationSubscriptions[0]

              token.organizations = updatedUser.organizationMemberships.map(membership => ({
                id: membership.organization.id,
                name: membership.organization.name,
                role: membership.role,
                slug: membership.organization.slug,
                accountType: membership.organization.accountType,
                subscriptionStatus: membership.organization.organizationSubscriptions[0]?.status || null
              }))

              token.primaryOrganization = primaryOrg ? {
                id: primaryOrg.id,
                name: primaryOrg.name,
                accountType: primaryOrg.accountType,
                subscriptionStatus: subscription?.status || null
              } : null
            }
          } catch (error) {
            console.error("Failed to refresh user data:", error)
          }
        } else {
          token = { ...token, ...session.user }
        }
      }

      // Check if refresh token needs rotation (rotate every 12 hours)
      if (token.refreshTokenExpiry && Date.now() > (token.refreshTokenExpiry as number) - (12 * 60 * 60 * 1000)) {
        // Generate new refresh token
        const newRefreshToken = generateRefreshToken()
        token.refreshToken = newRefreshToken
        token.refreshTokenExpiry = Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        
        // Update user's refresh token in databasepay
        try {
          await db.user.update({
            where: { id: token.id as string },
            data: { 
              refreshToken: newRefreshToken,
              refreshTokenExpiry: new Date(token.refreshTokenExpiry)
            }
          })
        } catch (error) {
          console.error("Failed to update refresh token:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.avatar = token.avatar as string
        session.user.isEmailVerified = token.isEmailVerified as boolean
        session.user.organizations = token.organizations as any[]
        session.user.primaryOrganization = token.primaryOrganization as any
        session.refreshTokenExpiry = token.refreshTokenExpiry as number
        session.jwtToken = token.jwtToken as string
        session.refreshToken = token.refreshToken as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true
      }
      return true
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      // Clear refresh token from database on logout
      if (token?.id) {
        try {
          await db.user.update({
            where: { id: token.id as string },
            data: { 
              refreshToken: null,
              refreshTokenExpiry: null
            }
          })
        } catch (error) {
          console.error("Failed to clear refresh token:", error)
        }
      }
    }
  }
}

// Helper function to generate refresh token
function generateRefreshToken(): string {
  return require('crypto').randomBytes(64).toString('hex')
}

// Helper function to generate JWT token
function generateJWTToken(userId: string, email: string): string {
  return jwt.sign(
    { 
      userId, 
      email, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    process.env.NEXTAUTH_SECRET || 'fallback-secret'
  )
}

// Helper function to verify JWT token
export function verifyJWTToken(token: string): any {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret')
  } catch (error) {
    return null
  }
}

// Types for better TypeScript support
declare module "next-auth" {
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

  interface User {
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
}

declare module "next-auth/jwt" {
  interface JWT {
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
    refreshToken?: string
    refreshTokenExpiry?: number
    jwtToken?: string
  }
} 