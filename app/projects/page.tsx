import { Suspense } from "react";
import { ProjectsHeader } from "@/components/projects-header";
import { ProjectsList } from "@/components/projects-list";
import { ProjectsLoading } from "@/components/projects-loading";

interface ProjectsPageProps {
  searchParams: {
    search?: string;
    sortBy?: 'name' | 'lastScan' | 'issues' | 'created';
    sortOrder?: 'asc' | 'desc';
    status?: string;
  };
}

/**
 * Projects Page - Client-Side Fetching
 * 
 * This page uses API routes to fetch and display projects
 * based on user access levels and search parameters.
 * 
 * Access Control:
 * - Organization owners can view all projects in their organization
 * - Regular users can only view projects they own within their organization
 * 
 * Features:
 * - API routes for data fetching
 * - Dynamic search and filtering
 * - Role-based access control
 * - Optimized database queries with indexing
 */
export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  return (
    <div className="space-y-8">
      <ProjectsHeader />
      
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Technical Implementation Notes:
 * 
 * 1. API Routes:
 *    - Data fetching through API routes
 *    - RESTful endpoints for CRUD operations
 *    - Used in: /api/v1/projects endpoints
 * 
 * 2. Server Actions:
 *    - Only for form submissions and mutations
 *    - Authentication handled server-side
 *    - Used in: createProject, updateProject, deleteProject actions
 * 
 * 3. Client Components:
 *    - Interactive elements (search, filters, sorting)
 *    - Real-time filtering and data fetching
 *    - Used in: ProjectsList, ProjectsHeader components
 * 
 * 4. Access Control:
 *    - Role-based project visibility
 *    - Implemented in API routes with database-level filtering
 * 
 * 5. Performance Optimizations:
 *    - Database indexes on commonly queried fields
 *    - Selective field fetching
 *    - Client-side caching and state management
 * 
 * 6. CRUD Operations:
 *    - Full project management (create, read, update, delete)
 *    - Edit project functionality with form pre-population
 *    - URL management within projects
 */
