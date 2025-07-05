import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

/**
 * ProjectsHeader - Server Component
 * 
 * Simple header component rendered on the server.
 * No interactivity needed, so kept as server component for better performance.
 */
export function ProjectsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">Manage and monitor all your web projects</p>
      </div>
      <Link href="/projects/new">
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </Link>
    </div>
  );
} 