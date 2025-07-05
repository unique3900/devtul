import { Suspense } from "react";
import { getProjects } from "@/app/actions/project";
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
 * Projects Page - SSR Implementation
 * 
 * This page uses Server-Side Rendering (SSR) to fetch and display projects
 * based on user access levels and search parameters.
 * 
 * Access Control:
 * - Organization owners can view all projects in their organization
 * - Regular users can only view projects they own within their organization
 * 
 * Features:
 * - SSR for initial page load performance
 * - Dynamic search and filtering
 * - Role-based access control
 * - Optimized database queries with indexing
 */
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  return (
    <div className="space-y-8">
      <ProjectsHeader />
      
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProjectsContent({ searchParams }: { searchParams: ProjectsPageProps['searchParams'] }) {
  const result = await getProjects(searchParams);

  if (!result.success) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return <ProjectsList initialProjects={result.projects || []} searchParams={searchParams} />;
}

/**
 * Technical Implementation Notes:
 * 
 * 1. SSR (Server-Side Rendering):
 *    - Initial page load renders on server
 *    - Faster perceived performance
 *    - SEO-friendly
 *    - Used in: This page component and ProjectsContent
 * 
 * 2. Server Actions:
 *    - Database access through server actions
 *    - Authentication handled server-side
 *    - Used in: getProjects() action
 * 
 * 3. Client Components:
 *    - Interactive elements (search, filters, sorting)
 *    - Real-time filtering and pagination
 *    - Used in: ProjectsList, ProjectsHeader components
 * 
 * 4. Access Control:
 *    - Role-based project visibility
 *    - Implemented in server action with database-level filtering
 * 
 * 5. Performance Optimizations:
 *    - Database indexes on commonly queried fields
 *    - Selective field fetching
 *    - Suspense for loading states
 */
