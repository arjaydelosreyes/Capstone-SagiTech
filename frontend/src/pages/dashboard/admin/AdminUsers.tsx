import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, MoreVertical, Eye, Trash2, UserCheck, Calendar } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { User } from "@/types";

export const AdminUsers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("sagitech-user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== "admin") {
        navigate("/login");
        return;
      }
      setUser(parsedUser);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Mock user data
  const allUsers = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@farm.com",
      role: "farmer" as const,
      createdAt: new Date("2024-01-15"),
      lastActive: new Date("2024-01-20"),
      totalScans: 23,
      status: "active"
    },
    {
      id: "2", 
      name: "Maria Garcia",
      email: "maria.garcia@agri.com",
      role: "farmer" as const,
      createdAt: new Date("2024-01-10"),
      lastActive: new Date("2024-01-19"),
      totalScans: 45,
      status: "active"
    },
    {
      id: "3",
      name: "Demo Farmer",
      email: "farmer@demo.com",
      role: "farmer" as const,
      createdAt: new Date("2024-01-01"),
      lastActive: new Date("2024-01-20"),
      totalScans: 67,
      status: "active"
    },
    {
      id: "4",
      name: "Alex Kim",
      email: "alex.kim@banana.farm",
      role: "farmer" as const,
      createdAt: new Date("2024-01-18"),
      lastActive: new Date("2024-01-18"),
      totalScans: 12,
      status: "inactive"
    },
    {
      id: "5",
      name: "Sarah Wilson",
      email: "sarah@organicfarm.net",
      role: "farmer" as const,
      createdAt: new Date("2024-01-12"),
      lastActive: new Date("2024-01-19"),
      totalScans: 34,
      status: "active"
    }
  ];

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = allUsers.filter(u => u.status === "active").length;
  const totalScans = allUsers.reduce((sum, u) => sum + u.totalScans, 0);
  const newUsersThisMonth = allUsers.filter(u => 
    new Date(u.createdAt).getMonth() === new Date().getMonth()
  ).length;

  if (!user) return null;

  return (
    <AppLayout title="User Management" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">User Management 👥</h1>
          <p className="text-muted-foreground">
            Monitor and manage farmer accounts across the platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard className="text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{allUsers.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{totalScans}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{newUsersThisMonth}</p>
              <p className="text-sm text-muted-foreground">New This Month</p>
            </div>
          </GlassCard>
        </div>

        {/* Search & Filters */}
        <GlassCard>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <GlassButton variant="glass" size="sm">
                Export Users
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Users Table */}
        <GlassCard>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Farmers ({filteredUsers.length})</h3>
            
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Active</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Scans</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userData) => (
                      <tr key={userData.id} className="border-b border-glass-border/50 hover:bg-primary-glass/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {userData.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{userData.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{userData.email}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {new Date(userData.lastActive).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                            {userData.totalScans}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            userData.status === 'active' 
                              ? 'bg-green-500/20 text-green-700 dark:text-green-300' 
                              : 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                          }`}>
                            {userData.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <GlassButton variant="glass" size="sm">
                              <Eye className="h-3 w-3" />
                            </GlassButton>
                            <GlassButton variant="glass" size="sm">
                              <MoreVertical className="h-3 w-3" />
                            </GlassButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No users found matching your search.</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* User Activity Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Top Active Users</h3>
              <div className="space-y-3">
                {allUsers
                  .sort((a, b) => b.totalScans - a.totalScans)
                  .slice(0, 5)
                  .map((userData, index) => (
                    <div key={userData.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-4">#{index + 1}</span>
                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-xs text-primary">
                            {userData.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{userData.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{userData.totalScans} scans</span>
                    </div>
                  ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="bg-primary-glass border-primary/30">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
              <div className="space-y-3">
                <GlassButton variant="primary" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Broadcast Message to All Users
                </GlassButton>
                <GlassButton variant="glass" className="w-full justify-start">
                  <Eye className="h-4 w-4 mr-2" />
                  Export User Activity Report
                </GlassButton>
                <GlassButton variant="glass" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule System Maintenance
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
};