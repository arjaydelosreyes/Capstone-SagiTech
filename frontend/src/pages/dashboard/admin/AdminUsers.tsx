import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, MoreVertical, Eye, UserCheck, Calendar } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { User } from "@/types";
import { adminApi } from "@/utils/adminApi";

export const AdminUsers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<{ totalScans: number; newThisMonth: number }>(
    { totalScans: 0, newThisMonth: 0 }
  );
  const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => {
    adminApi.getAllUsers()
      .then(res => {
        setAllUsers(res.data as any[]);
        setLoading(false);
      })
      .catch(() => {
        setAllUsers([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    adminApi.getDashboardOverview()
      .then(res => {
        setSystemStats({
          totalScans: res.data.totalScans,
          newThisMonth: res.data.newThisMonth
        });
        setStatsLoading(false);
      })
      .catch(() => {
        setSystemStats({ totalScans: 0, newThisMonth: 0 });
        setStatsLoading(false);
      });
  }, []);

  const filteredUsers = allUsers.filter((user: any) =>
    (user.user?.first_name + ' ' + user.user?.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = allUsers.length; // You can refine this if you have a status field
  const totalScans = statsLoading ? "..." : systemStats.totalScans;
  const newUsersThisMonth = allUsers.filter((u: any) => {
    const joined = new Date(u.user?.date_joined || '');
    const now = new Date();
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
  }).length;

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
            <h3 className="text-lg font-semibold text-foreground">Users ({filteredUsers.length})</h3>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userData: any) => (
                      <tr key={userData.id} className="border-b border-glass-border/50 hover:bg-primary-glass/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {(userData.user?.first_name?.[0] || '') + (userData.user?.last_name?.[0] || userData.user?.username?.[0] || '')}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{userData.user?.first_name || userData.user?.username} {userData.user?.last_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{userData.user?.email}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {userData.user?.date_joined ? new Date(userData.user.date_joined).toLocaleDateString() : ''}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{userData.role}</td>
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
      </div>
    </AppLayout>
  );
};