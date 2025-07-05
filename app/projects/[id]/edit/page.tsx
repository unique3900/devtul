import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditProjectForm } from "@/components/edit-project-form";

interface EditProjectPageProps {
  params: {
    id: string;
  };
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground">Update your project settings and configuration</p>
        </div>
      </div>

      <EditProjectForm projectId={params.id} />
    </div>
  );
} 