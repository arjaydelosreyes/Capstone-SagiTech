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
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType, ImageRun } from "docx";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { adminApi } from "@/utils/adminApi";

export const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    adminApi.getAnalyticsOverview()
      .then(res => {
        setAnalytics(res.data);
        setLoading(false);
      })
      .catch(() => {
        setAnalytics(null);
        setLoading(false);
      });
  }, []);

  if (!user) return null;

  // Use analytics data or fallback to ... for loading
  const metricCards = [
    {
      title: "Platform Usage",
      value: loading || !analytics ? "..." : analytics.totalScans,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/20",
      change: ""
    },
    {
      title: "Active Farmers",
      value: loading || !analytics ? "..." : analytics.totalUsers,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/20",
      change: ""
    },
    {
      title: "Bananas Analyzed",
      value: loading || !analytics ? "..." : analytics.totalBananas,
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/20",
      change: ""
    },
    {
      title: "Avg AI Accuracy",
      value: loading || !analytics ? "..." : `${analytics.avgConfidence}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/20",
      change: ""
    }
  ];

  const platformGrowthData = analytics?.userGrowth || [];
  const ripenessChartData = analytics?.ripenessDistribution ?
    Object.entries(analytics.ripenessDistribution).map(([ripeness, count]) => ({
      name: ripeness,
      value: count,
      color: getRipenessColor(ripeness)
    })) : [];
  const topPerformers = analytics?.topPerformers || [];

  // CSV export logic for report
  const handleExportCSV = () => {
    const branding = "SagiTech - Saba Banana Ripeness and Yield Prediction";
    const exportTime = "Exported: " + new Date().toLocaleString();
    const note = "All data is confidential.";
    const rows = [];
    rows.push(branding);
    rows.push(exportTime);
    rows.push(note);
    rows.push(""); // Empty row for spacing
    // Top-level stats
    rows.push(["Total Scans", analytics?.totalScans, "", ""].join(","));
    rows.push(["Total Users", analytics?.totalUsers, "", ""].join(","));
    rows.push(["Total Bananas", analytics?.totalBananas, "", ""].join(","));
    rows.push(["Avg AI Accuracy", analytics?.avgConfidence + "%", "", ""].join(","));
    rows.push(["", "", "", ""].join(","));
    // Ripeness Distribution
    rows.push(["Ripeness Stage", "Count", "", ""].join(","));
    Object.entries(analytics?.ripenessDistribution || {}).forEach(([stage, count]) => {
      rows.push([stage, count, "", ""].join(","));
    });
    rows.push(["", "", "", ""].join(","));
    // Top Performers
    rows.push(["Top Performers", "", "", ""].join(","));
    rows.push(["Name", "Email", "Scans", "Accuracy"].join(","));
    topPerformers.forEach(p => {
      rows.push([p.name, p.email, p.scans, p.accuracy + "%"].join(","));
    });
    // Convert to CSV
    const csvContent = rows.join("\n");
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

  const handleExportWord = async () => {
    // Fetch the logo as arrayBuffer, handle errors gracefully
    const logoUrl = "/SagiTech_Logo.png";
    let logoData: ArrayBuffer | null = null;
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        logoData = await response.arrayBuffer();
      }
    } catch (e) {
      logoData = null;
    }
    const now = new Date();
    const exportDate = now.toLocaleString();

    // Build up the children array for the docx section
    const children = [];
    if (logoData && logoData.byteLength > 0) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: new Uint8Array(logoData),
              type: "png",
              transformation: { width: 120, height: 120 },
            })
          ],
          alignment: "center"
        })
      );
    }
    children.push(
      new Paragraph({
        text: "SagiTech - Saba Banana Ripeness and Yield Prediction",
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
        alignment: "center"
      }),
      new Paragraph({
        text: `Exported: ${exportDate}`,
        spacing: { after: 100 },
        alignment: "center"
      }),
      new Paragraph({
        text: "All data is confidential.",
        spacing: { after: 200 },
        alignment: "center"
      }),
      // Key Metrics
      new Paragraph({
        text: `Key Metrics`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Total Scans: ${analytics?.totalScans}\nTotal Users: ${analytics?.totalUsers}\nTotal Bananas: ${analytics?.totalBananas}\nAverage Confidence: ${analytics?.avgConfidence}%`,
        spacing: { after: 200 },
      }),
      // Ripeness Breakdown Table
      new Paragraph({
        text: `Ripeness Breakdown`,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Ripeness")] }),
              new TableCell({ children: [new Paragraph("Count")] }),
            ],
          }),
          ...Object.entries(analytics?.ripenessDistribution || {}).map(([ripeness, count]) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(ripeness)] }),
                new TableCell({ children: [new Paragraph(String(count))] }),
              ],
            })
          ),
        ],
      }),
      // User Growth Table
      new Paragraph({
        text: `User Growth (Last 6 Months)`,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Month")] }),
              new TableCell({ children: [new Paragraph("Users")] }),
              new TableCell({ children: [new Paragraph("Scans")] }),
            ],
          }),
          ...(analytics?.userGrowth || []).map((row: any) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(row.month)] }),
                new TableCell({ children: [new Paragraph(String(row.users))] }),
                new TableCell({ children: [new Paragraph(String(row.scans))] }),
              ],
            })
          ),
        ],
      }),
      // Top Performers Table
      new Paragraph({
        text: `Top Performers`,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Name")] }),
              new TableCell({ children: [new Paragraph("Email")] }),
              new TableCell({ children: [new Paragraph("Scans")] }),
              new TableCell({ children: [new Paragraph("Accuracy")] }),
            ],
          }),
          ...(analytics?.topPerformers || []).map((p: any) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(p.name)] }),
                new TableCell({ children: [new Paragraph(p.email)] }),
                new TableCell({ children: [new Paragraph(String(p.scans))] }),
                new TableCell({ children: [new Paragraph(p.accuracy + "%")] }),
              ],
            })
          ),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          children,
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "admin-analytics-report.docx");
  };

  const handleExportExcel = () => {
    const now = new Date();
    const exportDate = now.toLocaleString();
    const sheetData = [
      ["SagiTech Logo: See attached or visit https://sagitech.com"],
      ["SagiTech - Saba Banana Ripeness and Yield Prediction"],
      ["Exported: " + exportDate],
      ["All data is confidential."],
      [],
      ["Metric", "Value", "", ""],
      ["Total Scans", analytics?.totalScans, "", ""],
      ["Total Users", analytics?.totalUsers, "", ""],
      ["Total Bananas", analytics?.totalBananas, "", ""],
      ["Avg AI Accuracy", analytics?.avgConfidence + "%", "", ""],
      [],
      ["Ripeness Stage", "Count", "", ""],
      ...Object.entries(analytics?.ripenessDistribution || {}).map(([stage, count]) => [stage, count, "", ""]),
      [],
      ["Name", "Email", "Scans", "Accuracy"],
      ...topPerformers.map(p => [p.name, p.email, p.scans, p.accuracy + "%"]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");
    XLSX.writeFile(workbook, "admin-analytics-report.xlsx");
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <GlassButton variant="primary" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </GlassButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportWord}>Export as Word (.docx)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>Export as Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                {topPerformers.map((performer, index) => (
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