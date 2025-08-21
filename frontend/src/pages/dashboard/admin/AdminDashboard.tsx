import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, BarChart3, Settings, TrendingUp, Camera } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { apiService } from "@/services/ApiService";
import useAuth from "@/hooks/useAuth";
import useApiError from "@/hooks/useApiError";
import ErrorBoundary from "@/components/ErrorBoundary";

const AdminDashboardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth({ requiredRole: 'admin' });
  const { executeWithErrorHandling, isLoading } = useApiError();
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalScans: 0,
    newThisMonth: 0,
    systemUptime: "0%"
  });

  useEffect(() => {
    if (!user) return;

    // Fetch recent activity
    executeWithErrorHandling(async () => {
      const activityData = await apiService.getRecentActivity();
      setRecentActivity(activityData);
      return activityData;
    }, 'Fetch Recent Activity', true);

    // Fetch dashboard overview
    executeWithErrorHandling(async () => {
      const statsData = await apiService.getDashboardOverview();
      setSystemStats(statsData);
      return statsData;
    }, 'Fetch Dashboard Overview', true);
  }, [user, executeWithErrorHandling]);

  const statCards = [
    {
      title: "Total Users",
      value: isLoading ? "..." : systemStats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      change: ""
    },
    {
      title: "Active Users",
      value: isLoading ? "..." : systemStats.activeUsers,
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/20",
      change: ""
    },
    {
      title: "Total Scans",
      value: isLoading ? "..." : systemStats.totalScans,
      icon: Camera,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20",
      change: ""
    },
    {
      title: "New This Month",
      value: isLoading ? "..." : systemStats.newThisMonth,
      icon: Camera,
      color: "text-orange-500",
      bgColor: "bg-orange-500/20",
      change: ""
    },
    {
      title: "System Uptime",
      value: isLoading ? "..." : systemStats.systemUptime,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/20",
      change: ""
    }
  ];

  const quickActions = [
    {
      title: "Manage Users",
      description: "View, edit, and manage farmer accounts",
      icon: Users,
      action: () => navigate("/dashboard/admin/users"),
      color: "primary"
    },
    {
      title: "System Analytics",
      description: "Monitor system-wide performance and usage",
      icon: BarChart3,
      action: () => navigate("/dashboard/admin/analytics"),
      color: "secondary"
    },
    {
      title: "Settings",
      description: "Configure system settings and preferences",
      icon: Settings,
      action: () => navigate("/dashboard/admin/settings"),
      color: "glass"
    }
  ];

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (!user) return null;

  return (
    <AppLayout title="Admin Dashboard" user={user}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, {user.name ? user.name.split(' ')[0] : user.first_name ? user.first_name : user.username ? user.username : "there"}! 🛠️
          </h1>
          <h2 className="text-2xl font-bold text-foreground mt-2">
            Admin Dashboard 🔧
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage the SagiTech platform
          </p>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <GlassCard key={index}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xs text-success mt-1">{stat.change}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <GlassCard key={index} className="cursor-pointer" onClick={action.action}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{action.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                  <GlassButton variant={action.color as any} size="sm" className="w-full">
                    {action.title}
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Recent User Activity</h3>
              {isLoading ? (
                <div>Loading...</div>
              ) : recentActivity.length === 0 ? (
                <div className="text-muted-foreground">No recent activity.</div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-glass-border last:border-b-0">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{log.username || "System"}</p>
                        <p className="text-xs text-muted-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">System Health</h3>
              <div className="space-y-4">
                {[
                  { metric: "Server Response Time", value: "42ms", status: "excellent" },
                  { metric: "Database Performance", value: "98%", status: "good" },
                  { metric: "AI Model Accuracy", value: "94.2%", status: "excellent" },
                  { metric: "Storage Usage", value: "67%", status: "good" },
                  { metric: "Active Connections", value: "156", status: "normal" }
                ].map((health, index) => {
                  const statusColors = {
                    excellent: "text-emerald-500",
                    good: "text-green-500",
                    normal: "text-blue-500",
                    warning: "text-yellow-500",
                    critical: "text-red-500"
                  };
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{health.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{health.value}</span>
                        <div className={`w-2 h-2 rounded-full ${statusColors[health.status].replace('text-', 'bg-')}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Platform Insights */}
        <GlassCard className="bg-primary-glass border-primary/30">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Platform Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">94.2%</p>
                <p className="text-sm text-muted-foreground">AI Accuracy Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1.8s</p>
                <p className="text-sm text-muted-foreground">Avg Scan Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">4.8★</p>
                <p className="text-sm text-muted-foreground">User Satisfaction</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

// Export with Error Boundary wrapper
export const AdminDashboard = () => (
  <ErrorBoundary>
    <AdminDashboardContent />
  </ErrorBoundary>
);