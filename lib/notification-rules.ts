import { PrismaClient } from '@prisma/client'

export interface NotificationRule {
  activityType: string
  notifyScope: 'organization' | 'project' | 'user' | 'custom'
  roles?: string[] // Specific roles to notify
  conditions?: (activity: any) => boolean
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | 'Urgent'
  category: 'Project' | 'Scan' | 'Security' | 'Accessibility' | 'SEO' | 'User' | 'Organization' | 'System'
}

// Define notification rules for different activities
export const NOTIFICATION_RULES: Record<string, NotificationRule> = {
  ProjectCreated: {
    activityType: 'ProjectCreated',
    notifyScope: 'project', // Only notify project owner/members
    roles: ['Owner', 'Admin'],
    priority: 'Medium',
    category: 'Project'
  },
  
  ScanStarted: {
    activityType: 'ScanStarted', 
    notifyScope: 'project', // Notify all project members
    priority: 'Low',
    category: 'Scan'
  },
  
  ScanCompleted: {
    activityType: 'ScanCompleted',
    notifyScope: 'project', // Notify all project members
    priority: 'Medium',
    category: 'Scan'
  },
  
  ScanFailed: {
    activityType: 'ScanFailed',
    notifyScope: 'project',
    roles: ['Owner', 'Admin'], // Only notify admins about failures
    priority: 'High',
    category: 'Scan'
  },
  
  UserAdded: {
    activityType: 'UserAdded',
    notifyScope: 'organization', // Notify whole organization
    roles: ['Owner', 'Admin'],
    priority: 'Medium',
    category: 'User'
  },
  
  UserInvited: {
    activityType: 'UserInvited',
    notifyScope: 'organization',
    roles: ['Owner', 'Admin'],
    priority: 'Low',
    category: 'User'
  },
  
  SecurityIssueFound: {
    activityType: 'SecurityIssueFound',
    notifyScope: 'project',
    conditions: (activity) => activity.metadata?.severity === 'Critical' || activity.metadata?.severity === 'High',
    priority: 'Critical',
    category: 'Security'
  },
  
  AccessibilityIssueFound: {
    activityType: 'AccessibilityIssueFound', 
    notifyScope: 'project',
    conditions: (activity) => activity.metadata?.severity === 'Critical',
    priority: 'High',
    category: 'Accessibility'
  },
  
  SEOIssueFound: {
    activityType: 'SEOIssueFound',
    notifyScope: 'project',
    conditions: (activity) => activity.metadata?.severity === 'Critical' || activity.metadata?.severity === 'High',
    priority: 'Medium',
    category: 'SEO'
  }
}

export interface ActivityData {
  type: string
  organizationId: string
  projectId?: string
  scanId?: string
  userId?: string
  title: string
  message: string
  metadata?: any
  priority?: string
  category?: string
}

export async function createActivityWithNotifications(
  prisma: PrismaClient,
  activityData: ActivityData
): Promise<void> {
  const rule = NOTIFICATION_RULES[activityData.type]
  
  if (!rule) {
    console.warn(`No notification rule found for activity type: ${activityData.type}`)
    return
  }

  // Determine who should be notified
  const usersToNotify = await getUsersToNotify(prisma, activityData, rule)
  
  // Create the activity
  await prisma.recentActivity.create({
    data: {
      type: activityData.type as any,
      organizationId: activityData.organizationId,
      projectId: activityData.projectId,
      scanId: activityData.scanId,
      userId: activityData.userId,
      title: activityData.title,
      message: activityData.message,
      priority: rule.priority as any,
      category: rule.category as any,
      color: getActivityColor(rule.category),
      icon: getActivityIcon(activityData.type),
      metadata: activityData.metadata,
      notificationRules: {
        scope: rule.notifyScope,
        roles: rule.roles,
        notifiedUsers: usersToNotify.map(u => u.id)
      },
      deliveredTo: {
        connect: usersToNotify.map(user => ({ id: user.id }))
      }
    }
  })
  
  // Here you could also send email notifications, push notifications, etc.
  console.log(`Created activity ${activityData.type} and notified ${usersToNotify.length} users`)
}

async function getUsersToNotify(
  prisma: PrismaClient, 
  activityData: ActivityData, 
  rule: NotificationRule
): Promise<{ id: string; email: string }[]> {
  let users: { id: string; email: string }[] = []
  
  switch (rule.notifyScope) {
    case 'organization':
      // Get all users in the organization
      const orgMembers = await prisma.organizationMember.findMany({
        where: { 
          organizationId: activityData.organizationId,
          isActive: true,
          ...(rule.roles && { role: { in: rule.roles as any[] } })
        },
        include: { user: { select: { id: true, email: true } } }
      })
      users = orgMembers.map(member => member.user)
      break
      
    case 'project':
      if (!activityData.projectId) break
      
      // Get project owner
      const project = await prisma.project.findUnique({
        where: { id: activityData.projectId },
        include: { owner: { select: { id: true, email: true } } }
      })
      
      if (project) {
        users.push(project.owner)
        
        // Get project members
        const projectMembers = await prisma.projectMember.findMany({
          where: { 
            projectId: activityData.projectId,
            isActive: true,
            ...(rule.roles && { role: { in: rule.roles as any[] } })
          },
          include: { user: { select: { id: true, email: true } } }
        })
        
        users.push(...projectMembers.map(member => member.user))
      }
      break
      
    case 'user':
      if (activityData.userId) {
        const user = await prisma.user.findUnique({
          where: { id: activityData.userId },
          select: { id: true, email: true }
        })
        if (user) users.push(user)
      }
      break
  }
  
  // Remove duplicates
  const uniqueUsers = users.filter((user, index, self) => 
    index === self.findIndex(u => u.id === user.id)
  )
  
  // Apply conditions if any
  if (rule.conditions && !rule.conditions(activityData)) {
    return []
  }
  
  return uniqueUsers
}

function getActivityColor(category: string): string {
  const colors: Record<string, string> = {
    Project: '#3B82F6', // blue
    Scan: '#10B981', // green
    Security: '#EF4444', // red
    Accessibility: '#8B5CF6', // purple
    SEO: '#F59E0B', // amber
    User: '#06B6D4', // cyan
    Organization: '#6366F1', // indigo
    System: '#6B7280' // gray
  }
  return colors[category] || colors.System
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    ProjectCreated: 'FolderPlus',
    ProjectUpdated: 'FolderEdit',
    ProjectDeleted: 'FolderMinus',
    ScanStarted: 'PlayCircle',
    ScanCompleted: 'CheckCircle',
    ScanFailed: 'XCircle',
    UserAdded: 'UserPlus',
    UserRemoved: 'UserMinus', 
    UserInvited: 'Mail',
    SecurityIssueFound: 'Shield',
    AccessibilityIssueFound: 'Accessibility',
    SEOIssueFound: 'Search',
    System: 'Settings',
    Export: 'Download',
    Import: 'Upload'
  }
  return icons[type] || icons.System
}

// Helper function to create specific activity types
export async function createScanActivity(
  prisma: PrismaClient,
  type: 'ScanStarted' | 'ScanCompleted' | 'ScanFailed',
  projectId: string,
  scanId: string,
  userId: string,
  metadata?: any
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, organizationId: true }
  })
  
  if (!project) return
  
  const messages = {
    ScanStarted: `Scan started for project "${project.name}"`,
    ScanCompleted: `Scan completed for project "${project.name}"`,
    ScanFailed: `Scan failed for project "${project.name}"`
  }
  
  await createActivityWithNotifications(prisma, {
    type,
    organizationId: project.organizationId!,
    projectId,
    scanId,
    userId,
    title: messages[type],
    message: messages[type],
    metadata
  })
}

export async function createUserActivity(
  prisma: PrismaClient,
  type: 'UserAdded' | 'UserInvited' | 'UserRemoved',
  organizationId: string,
  targetUserId: string,
  actorUserId: string,
  projectId?: string
) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { firstName: true, lastName: true, email: true }
  })
  
  if (!targetUser) return
  
  const userName = `${targetUser.firstName} ${targetUser.lastName}`.trim() || targetUser.email
  
  const messages = {
    UserAdded: `${userName} was added to the organization`,
    UserInvited: `${userName} was invited to the organization`, 
    UserRemoved: `${userName} was removed from the organization`
  }
  
  await createActivityWithNotifications(prisma, {
    type,
    organizationId,
    projectId,
    userId: actorUserId,
    title: messages[type],
    message: messages[type],
    metadata: { targetUserId, targetUserName: userName }
  })
}

export async function createIssueActivity(
  prisma: PrismaClient,
  type: 'SecurityIssueFound' | 'AccessibilityIssueFound' | 'SEOIssueFound',
  projectId: string,
  scanId: string,
  issueCount: number,
  severity: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, organizationId: true }
  })
  
  if (!project) return
  
  const issueTypes = {
    SecurityIssueFound: 'security',
    AccessibilityIssueFound: 'accessibility',
    SEOIssueFound: 'SEO'
  }
  
  const issueType = issueTypes[type]
  const message = `${issueCount} ${severity.toLowerCase()} ${issueType} ${issueCount === 1 ? 'issue' : 'issues'} found in "${project.name}"`
  
  await createActivityWithNotifications(prisma, {
    type,
    organizationId: project.organizationId!,
    projectId,
    scanId,
    title: `${severity} ${issueType} issues detected`,
    message,
    metadata: { issueCount, severity, issueType }
  })
} 