import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, History, BarChart3, Banana, TrendingUp, Eye } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { User, ScanResult } from "@/types";
import { getRipenessBadgeClass } from "@/utils/analyzeBanana";
import { authService } from "@/utils/authService";

export const FarmerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("sagitech-user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== "farmer") {
        navigate("/login");
        return;
      }
      setUser(parsedUser);
      setLoading(true);
      setError(null);
      authService.fetchScanRecords()
        .then((records) => {
          const normalizedScans = records.map(scan => ({
            ...scan,
            bananaCount: scan.banana_count,
            confidence: scan.avg_confidence,
            ripeness: scan.ripeness || scan.ripeness_results?.[0]?.ripeness || "",
          }));
          setRecentScans(normalizedScans); // Use all scans for stats
          setLoading(false);
        })
        .catch(() => {
          setRecentScans([]);
          setError("Failed to load recent scans. Please try again.");
          setLoading(false);
        });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const totalBananas = recentScans.reduce((total, scan) => total + scan.bananaCount, 0);
  const averageConfidence = recentScans.length > 0 
    ? Math.round(recentScans.reduce((total, scan) => total + scan.confidence, 0) / recentScans.length)
    : 0;

  const ripenessBreakdown = recentScans.reduce((acc, scan) => {
    acc[scan.ripeness] = (acc[scan.ripeness] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statCards = [
    {
      title: "Total Scans",
      value: recentScans.length,
      icon: Camera,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20"
    },
    {
      title: "Total Bananas",
      value: totalBananas,
      icon: Banana,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/20"
    },
    {
      title: "Avg Confidence",
      value: `${averageConfidence}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/20"
    },
    {
      title: "Recent Activity",
      value: recentScans.length > 0 ? "Active" : "No Data",
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20"
    }
  ];

  const quickActions = [
    {
      title: "Scan Bananas",
      description: "Upload or capture banana images for AI analysis",
      icon: Camera,
      action: () => navigate("/dashboard/farmer/scan"),
      color: "primary"
    },
    {
      title: "View History",
      description: "Browse your previous scan results",
      icon: History,
      action: () => navigate("/dashboard/farmer/history"),
      color: "secondary"
    },
    {
      title: "Analytics",
      description: "Explore detailed farming insights",
      icon: BarChart3,
      action: () => navigate("/dashboard/farmer/analytics"),
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
  if (loading) {
    return (
      <AppLayout title="Farmer Dashboard" user={user}>
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <span className="ml-4 text-lg text-muted-foreground">Loading dashboard...</span>
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Farmer Dashboard" user={user}>
        <div className="flex flex-col justify-center items-center min-h-[40vh]">
          <span className="text-red-500 text-lg mb-4">{error}</span>
          <GlassButton onClick={() => window.location.reload()} variant="primary">
            Retry
          </GlassButton>
        </div>
      </AppLayout>
    );
  }

  // For the 'Recent Scans' section, only show the last 3
  const recentThreeScans = recentScans.slice(0, 3);

  return (
    <AppLayout title="Farmer Dashboard" user={user}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, {user.name ? user.name.split(' ')[0] : user.first_name ? user.first_name : user.username ? user.username : "there"}! 🍌
          </h1>
          <p className="text-muted-foreground">
            Monitor your banana farming operations with AI-powered insights
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <GlassCard key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
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

        {/* Recent Scans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Recent Scans</h2>
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => navigate("/dashboard/farmer/history")}
            >
              <Eye className="h-4 w-4 mr-2" />
              View All
            </GlassButton>
          </div>

          {recentThreeScans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentThreeScans.map((scan) => (
                <GlassCard key={scan.id}>
                  <div className="space-y-3">
                    <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden">
                      <img
                        src={scan.image}
                        alt="Scanned banana"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getRipenessBadgeClass(scan.ripeness)}`}>
                        {scan.ripeness}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {scan.confidence}% confidence
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {scan.bananaCount} banana{scan.bananaCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(scan.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="text-center py-12">
              <div className="space-y-4">
                <Banana className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">No scans yet</h3>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Ripeness Overview */}
        {Object.keys(ripenessBreakdown).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Ripeness Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ripenessBreakdown).map(([ripeness, count]) => (
                <GlassCard key={ripeness} className="text-center">
                  <div className="space-y-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRipenessBadgeClass(ripeness)}`}>
                      {ripeness}
                    </span>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">scans</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};