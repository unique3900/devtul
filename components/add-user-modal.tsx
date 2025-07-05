"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { UserPlus, Mail, Users, FolderOpen, X } from "lucide-react";

// Create schema based on context
const createUserSchema = (isProjectContext: boolean) => z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: isProjectContext 
    ? z.enum(["Admin", "Collaborator", "Viewer"])  // ProjectRole for projects
    : z.enum(["Admin", "Member", "Viewer"]),       // OrganizationRole for organization
  projectIds: z.array(z.string()).optional(),
});

// Dynamic type based on context
type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  projectIds?: string[];
};

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  isOwner: boolean;
  memberCount: number;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string; // If provided, user will be added to this specific project
  projectName?: string; // For display purposes
  showProjectSelector?: boolean; // Whether to show project multi-selector
}

export function AddUserModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  projectId, 
  projectName,
  showProjectSelector = false 
}: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Determine if this is a project context (adding to projects vs organization only)
  const isProjectContext = Boolean(projectId || showProjectSelector);
  const userSchema = createUserSchema(isProjectContext);
  const defaultRole = isProjectContext ? "Collaborator" : "Collaborator";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: defaultRole,
      projectIds: [],
    },
  });

  const selectedRole = watch("role");

  // Fetch available projects when modal opens and showProjectSelector is true
  useEffect(() => {
    if (isOpen && showProjectSelector && !projectId) {
      fetchProjects();
    }
  }, [isOpen, showProjectSelector, projectId]);

  // Set initial project selection
  useEffect(() => {
    if (projectId) {
      setSelectedProjects([projectId]);
      setValue("projectIds", [projectId]);
    } else if (showProjectSelector) {
      setSelectedProjects([]);
      setValue("projectIds", []);
    }
  }, [projectId, showProjectSelector]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch("/api/v1/projects/available");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      } else {
        toast.error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    const newSelected = selectedProjects.includes(projectId)
      ? selectedProjects.filter(id => id !== projectId)
      : [...selectedProjects, projectId];
    
    setSelectedProjects(newSelected);
    setValue("projectIds", newSelected);
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);
      
      let endpoint = "";
      let body = {};

      if (projectId) {
        // Adding to specific project
        endpoint = `/api/v1/projects/${projectId}/users`;
        body = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        };
      } else if (showProjectSelector && selectedProjects.length > 0) {
        // Adding to multiple projects
        endpoint = "/api/v1/users/add-to-projects";
        body = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          projectIds: selectedProjects,
        };
      } else {
        // Adding to organization only
        endpoint = "/api/v1/users";
        body = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add user");
      }

      if (result.success) {
        toast.success(result.message || "User added successfully!");
        if (result.user.temporaryPassword) {
          toast.info(`Temporary password: ${result.user.temporaryPassword}`, {
            duration: 10000,
          });
        }
        reset();
        setSelectedProjects([]);
        onSuccess(); // This will handle closing the modal
      } else {
        toast.error(result.error || "Failed to add user");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedProjects([]);
    onClose();
  };

  const getProjectSelectionSummary = () => {
    if (selectedProjects.length === 0) return "No projects selected";
    if (selectedProjects.length === 1) return "1 project selected";
    return `${selectedProjects.length} projects selected`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add User {projectName && `to ${projectName}`}
          </DialogTitle>
          <DialogDescription>
            {projectId 
              ? `Add a new user to the ${projectName} project. They will receive a temporary password.`
              : showProjectSelector
              ? "Add a new user to selected projects. They will receive a temporary password."
              : "Add a new user to your organization. They will receive a temporary password."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setValue("role", value as any)} defaultValue={defaultRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    {isProjectContext ? (
                      <SelectItem value="Collaborator">Collaborator</SelectItem>
                    ) : (
                      <SelectItem value="Member">Member</SelectItem>
                    )}
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Selection */}
          {showProjectSelector && !projectId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Project Assignment
                </CardTitle>
                <CardDescription>
                  Select which projects the user should have access to
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{getProjectSelectionSummary()}</span>
                      {selectedProjects.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProjects([]);
                            setValue("projectIds", []);
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>

                    {selectedProjects.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedProjects.map(projectId => {
                          const project = projects.find(p => p.id === projectId);
                          return project ? (
                            <Badge key={projectId} variant="secondary" className="flex items-center gap-1">
                              {project.name}
                              <button
                                type="button"
                                onClick={() => handleProjectToggle(projectId)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}

                    <Separator />

                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleProjectToggle(project.id)}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedProjects.includes(project.id)}
                                onCheckedChange={() => handleProjectToggle(project.id)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{project.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {project.status}
                                </Badge>
                                {project.isOwner && (
                                  <Badge variant="secondary" className="text-xs">
                                    Owner
                                  </Badge>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {project.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Password Notice */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Temporary Password</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  The user will be created with the temporary password: <code className="bg-blue-100 px-1 rounded">devtool123</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={loading || (showProjectSelector && selectedProjects.length === 0)}
            >
              {loading ? "Adding..." : "Add User"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 