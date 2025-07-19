"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Users, Mail, Calendar, Shield, AlertTriangle, Info, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UserInfoDialog } from "./user-info-dialog";
import { AddUserModal } from "./add-user-modal";

interface Project {
  id: string;
  name: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date;
  joinedAt: Date;
  invitedAt?: Date;
  projects?: Project[];
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  
  // User info dialog state
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string, email: string} | null>(null);
  
  // Add user modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/v1/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      if (data.success) {
        setUsers(data.users || []);
        setUserRole(data.userRole || "");
      } else {
        setError(data.error || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Owner":
        return "bg-purple-100 text-purple-800";
      case "Admin":
        return "bg-blue-100 text-blue-800";
      case "Collaborator":
        return "bg-green-100 text-green-800";
      case "Viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Owner":
      case "Admin":
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Never";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const handleUserInfoClick = (user: User) => {
    setSelectedUser({ id: user.id, email: user.email });
    setIsUserInfoOpen(true);
  };

  const handleUserInfoClose = () => {
    setIsUserInfoOpen(false);
    setSelectedUser(null);
  };

  const handleAddUserModalClose = () => {
    setIsAddUserModalOpen(false);
  };

  const handleAddUserModalSuccess = () => {
    setIsAddUserModalOpen(false);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            {userRole === 'Owner' 
              ? "Manage all users in your organization"
              : userRole === 'Admin'
              ? "Manage project-specific users"
              : "View your team members"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsAddUserModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-red-600">Error loading users</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchUsers} className="mt-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Users Table */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({users.length})
            </CardTitle>
            <CardDescription>
              {userRole === 'Owner' 
                ? "All users in your organization"
                : userRole === 'Admin'
                ? "Users from projects you manage"
                : "Your team members from shared projects"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No users found</h3>
                <p className="text-muted-foreground">
                  Start by adding your first team member
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getRoleColor(user.role)}
                        >
                          <span className="mr-1">{getRoleIcon(user.role)}</span>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.projects && user.projects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.projects.slice(0, 2).map((project) => (
                              <Badge key={project.id} variant="outline" className="text-xs">
                                <FolderOpen className="h-3 w-3 mr-1" />
                                {project.name}
                              </Badge>
                            ))}
                            {user.projects.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.projects.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No projects</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserInfoClick(user)}
                          title="View user details"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Info Dialog */}
      {selectedUser && (
        <UserInfoDialog
          isOpen={isUserInfoOpen}
          onClose={handleUserInfoClose}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={handleAddUserModalClose}
        onSuccess={handleAddUserModalSuccess}
        showProjectSelector={true}
      />
    </div>
  );
} 