import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, TrendingUp, Activity, Calendar, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { User } from "@/types";
import { getRipenessColor } from "@/utils/analyzeBanana";
import { toast } from "@/hooks/use-toast";

export const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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

  // Mock system-wide analytics data
  const systemAnalytics = {
    totalScans: 2453,
    totalUsers: 127,
    totalBananas: 8734,
    avgConfidence: 91.4,
    ripenessDistribution: {
      "Not Mature": 643,
      "Mature": 891,
      "Ripe": 672,
      "Over Ripe": 247
    },
    userGrowth: [
      { month: "Jul", users: 45, scans: 234 },
      { month: "Aug", users: 67, scans: 456 },
      { month: "Sep", users: 89, scans: 678 },
      { month: "Oct", users: 103, scans: 892 },
      { month: "Nov", users: 118, scans: 1124 },
      { month: "Dec", users: 127, scans: 1345 }
    ],
    topPerformers: [
      { name: "Maria Garcia", email: "maria.garcia@agri.com", scans: 156, accuracy: 94.2 },
      { name: "John Doe", email: "john.doe@farm.com", scans: 134, accuracy: 92.8 },
      { name: "Demo Farmer", email: "farmer@demo.com", scans: 123, accuracy: 89.5 },
      { name: "Sarah Wilson", email: "sarah@organicfarm.net", scans: 98, accuracy: 96.1 },
      { name: "Alex Kim", email: "alex.kim@banana.farm", scans: 87, accuracy: 88.9 }
    ]
  };

  const metricCards = [
    {
      title: "Platform Usage",
      value: `${systemAnalytics.totalScans}`,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      change: "+23% this month"
    },
    {
      title: "Active Farmers",
      value: systemAnalytics.totalUsers,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/20",
      change: "+12 new this week"
    },
    {
      title: "Bananas Analyzed",
      value: `${systemAnalytics.totalBananas}`,
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20",
      change: "+1,247 this week"
    },
    {
      title: "Avg AI Accuracy",
      value: `${systemAnalytics.avgConfidence}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/20",
      change: "+2.1% improved"
    }
  ];

  // Prepare data for charts
  const platformGrowthData = systemAnalytics.userGrowth.map((data) => ({
    month: data.month,
    users: data.users,
    scans: data.scans
  }));

  const ripenessChartData = Object.entries(systemAnalytics.ripenessDistribution).map(([ripeness, count]) => ({
    name: ripeness,
    value: count,
    color: getRipenessColor(ripeness)
  }));

  // CSV export logic for report
  const handleExportCSV = () => {
    const rows = [];
    // Top-level stats
    rows.push(["Total Scans", systemAnalytics.totalScans]);
    rows.push(["Total Users", systemAnalytics.totalUsers]);
    rows.push(["Total Bananas", systemAnalytics.totalBananas]);
    rows.push(["Avg AI Accuracy", systemAnalytics.avgConfidence + "%"]);
    rows.push([]);
    // Ripeness Distribution
    rows.push(["Ripeness Stage", "Count"]);
    Object.entries(systemAnalytics.ripenessDistribution).forEach(([stage, count]) => {
      rows.push([stage, count]);
    });
    rows.push([]);
    // Top Performers
    rows.push(["Top Performers"]);
    rows.push(["Name", "Email", "Scans", "Accuracy"]);
    systemAnalytics.topPerformers.forEach(p => {
      rows.push([p.name, p.email, p.scans, p.accuracy + "%"]);
    });
    // Convert to CSV
    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admin-analytics-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast && toast({ title: "Export Successful", description: "CSV report has been downloaded." });
  };

  if (!user) return null;

  return (
    <AppLayout title="System Analytics" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">System Analytics 📈</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into platform performance and user behavior
            </p>
          </div>
          <GlassButton variant="primary" className="flex items-center gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export Report
          </GlassButton>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((metric, index) => (
            <GlassCard key={index}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-xs text-success mt-1">{metric.change}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Platform Growth */}
          <GlassCard>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Platform Growth</h3>
              {platformGrowthData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={platformGrowthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#3b82f6" name="Users" strokeWidth={2} />
                      <Line type="monotone" dataKey="scans" stroke="#facc15" name="Scans" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for platform growth.
                </div>
              )}
            </div>
          </GlassCard>

          {/* Global Ripeness Distribution */}
          <GlassCard>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Global Ripeness Analysis</h3>
              {ripenessChartData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={ripenessChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {ripenessChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for ripeness analysis.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performing Users */}
          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Top Performing Farmers</h3>
              <div className="space-y-3">
                {systemAnalytics.topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-glass-border last:border-b-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs text-primary">
                          {performer.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{performer.name}</p>
                        <p className="text-xs text-muted-foreground">{performer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{performer.scans} scans</p>
                      <p className="text-xs text-success">{performer.accuracy}% accuracy</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* System Performance */}
          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">System Performance</h3>
              <div className="space-y-4">
                {[
                  { metric: "Average Response Time", value: "1.2s", trend: "↓ 0.3s", status: "excellent" },
                  { metric: "System Uptime", value: "99.9%", trend: "↑ 0.1%", status: "excellent" },
                  { metric: "AI Model Accuracy", value: "91.4%", trend: "↑ 2.1%", status: "good" },
                  { metric: "User Satisfaction", value: "4.8/5", trend: "↑ 0.2", status: "excellent" },
                  { metric: "Error Rate", value: "0.02%", trend: "↓ 0.01%", status: "excellent" },
                ].map((perf, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{perf.metric}</p>
                      <p className="text-xs text-muted-foreground">{perf.trend}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{perf.value}</p>
                      <div className={`w-2 h-2 rounded-full ml-auto ${
                        perf.status === 'excellent' ? 'bg-emerald-500' : 
                        perf.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Usage Trends */}
        <GlassCard>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Daily Usage Trends</h3>
              <div className="flex gap-2">
                <GlassButton variant="glass" size="sm">Last 7 Days</GlassButton>
                <GlassButton variant="glass" size="sm">Last 30 Days</GlassButton>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                const usage = Math.floor(Math.random() * 100) + 20; // Mock data
                return (
                  <div key={day} className="text-center space-y-2">
                    <div className="h-20 bg-muted rounded-lg relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-500"
                        style={{ height: `${usage}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground">{day}</p>
                    <p className="text-xs text-muted-foreground">{usage}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* Insights & Recommendations */}
        <GlassCard className="bg-primary-glass border-primary/30">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">AI Insights & Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="p-3 bg-success/20 border border-success/30 rounded-lg">
                  <p className="text-sm font-medium text-foreground">✅ Peak Performance</p>
                  <p className="text-xs text-muted-foreground">System performing 15% above target metrics</p>
                </div>
                <div className="p-3 bg-primary/20 border border-primary/30 rounded-lg">
                  <p className="text-sm font-medium text-foreground">📈 Growth Opportunity</p>
                  <p className="text-xs text-muted-foreground">User engagement up 23% this month</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-warning/20 border border-warning/30 rounded-lg">
                  <p className="text-sm font-medium text-foreground">⚡ Optimization Tip</p>
                  <p className="text-xs text-muted-foreground">Consider scaling during peak hours (2-4 PM)</p>
                </div>
                <div className="p-3 bg-primary/20 border border-primary/30 rounded-lg">
                  <p className="text-sm font-medium text-foreground">🎯 Accuracy Focus</p>
                  <p className="text-xs text-muted-foreground">Model accuracy consistently above 90%</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};