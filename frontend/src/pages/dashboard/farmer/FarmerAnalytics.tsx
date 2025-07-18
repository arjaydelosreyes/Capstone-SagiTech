import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Calendar, Banana, Download } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { User, ScanResult } from "@/types";
import { getRipenessColor } from "@/utils/analyzeBanana";
import { GlassButton } from "@/components/ui/GlassButton";
import { toast } from "@/hooks/use-toast";
import { PieChart as RePieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Line, AreaChart, Area, LineChart } from 'recharts';
import { useCallback } from "react";
import { authService } from "@/utils/authService";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType, ImageRun } from "docx";

// Add a hook to detect dark mode
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(match.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    match.addEventListener('change', handler);
    return () => match.removeEventListener('change', handler);
  }, []);
  return isDark;
}

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value, color } = payload[0].payload;
    return (
      <div style={{
        background: '#22292f',
        color: color,
        borderRadius: 8,
        padding: '8px 16px',
        border: `1px solid ${color}`,
        fontWeight: 500,
      }}>
        <div>{name}</div>
        <div>{value} scans</div>
      </div>
    );
  }
  return null;
};

// Custom Legend for Pie Chart
const CustomPieLegend = ({ payload }) => (
  <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0 }}>
    {payload.map((entry, idx) => (
      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          background: entry.color,
          borderRadius: '50%',
        }} />
        <span style={{ color: entry.color }}>{entry.value}</span>
      </li>
    ))}
  </ul>
);

// Custom Tooltip for Line Chart
const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const scans = payload.find(p => p.dataKey === 'scans');
    const bananas = payload.find(p => p.dataKey === 'bananas');
    return (
      <div style={{
        background: '#22292f',
        color: '#fff',
        borderRadius: 8,
        padding: '8px 16px',
        border: '1px solid #0072B2',
        fontWeight: 500,
      }}>
        <div>{label}</div>
        <div>Scans: {scans ? scans.value : 0}</div>
        <div>Bananas: {bananas ? bananas.value : 0}</div>
      </div>
    );
  }
  return null;
};

// Custom Legend for Line Chart
const CustomLineLegend = ({ payload }) => (
  <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0 }}>
    {payload.map((entry, idx) => (
      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-block',
          width: 12,
          height: 12,
          background: entry.color,
          borderRadius: '50%',
        }} />
        <span style={{ color: entry.color }}>{entry.value}</span>
      </li>
    ))}
  </ul>
);

export const FarmerAnalytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDarkMode = useIsDarkMode();
  const [chartVisible, setChartVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setChartVisible(true), 100); // Delay for fade-in
  }, []);

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
      // Fetch scans from backend
      authService.fetchScanRecords()
        .then((records) => {
          const normalizedScans = records.map(scan => ({
            ...scan,
            bananaCount: scan.banana_count,
            confidence: scan.avg_confidence,
            ripeness: scan.ripeness || scan.ripeness_results?.[0]?.ripeness || "",
          }));
          setScans(normalizedScans);
          setLoading(false);
        })
        .catch(() => {
          setScans([]);
          setError("Failed to load analytics data. Please try again.");
          setLoading(false);
        });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Calculate analytics data
  const totalBananas = scans.reduce((total, scan) => total + scan.bananaCount, 0);
  const averageConfidence = scans.length > 0 
    ? Math.round(scans.reduce((total, scan) => total + scan.confidence, 0) / scans.length)
    : 0;

  const ripenessBreakdown = scans.reduce((acc, scan) => {
    acc[scan.ripeness] = (acc[scan.ripeness] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group scans by date for timeline
  const scansByDate = scans.reduce((acc, scan) => {
    const date = new Date(scan.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, count: 0, bananas: 0 };
    }
    acc[date].count += 1;
    acc[date].bananas += scan.bananaCount;
    return acc;
  }, {} as Record<string, { date: string; count: number; bananas: number }>);

  const timelineData = Object.values(scansByDate).slice(-7); // Last 7 days

  // Prepare data for charts
  const ripenessChartData = Object.entries(ripenessBreakdown).map(([ripeness, count]) => ({
    name: ripeness,
    value: count,
    color: getRipenessColor(ripeness)
  }));

  const timelineChartData = timelineData.map(day => ({
    date: day.date,
    bananas: day.bananas,
    scans: day.count
  }));

  // CSV export logic
  const handleExportCSV = () => {
    if (scans.length === 0) return;
    const headers = ["Date", "Ripeness", "Banana Count", "Confidence"];
    const rows = scans.map(scan => [
      new Date(scan.timestamp).toLocaleString(),
      scan.ripeness,
      scan.bananaCount,
      scan.confidence + "%"
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `banana-analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast && toast({ title: "Export Successful", description: "CSV file has been downloaded." });
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

    // Calculate analytics data
    const totalBananas = scans.reduce((total, scan) => total + scan.bananaCount, 0);
    const averageConfidence = scans.length > 0 
      ? Math.round(scans.reduce((total, scan) => total + scan.confidence, 0) / scans.length)
      : 0;
    const ripenessBreakdown = scans.reduce((acc, scan) => {
      acc[scan.ripeness] = (acc[scan.ripeness] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const scansByDate = scans.reduce((acc, scan) => {
      const date = new Date(scan.timestamp).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, count: 0, bananas: 0 };
      }
      acc[date].count += 1;
      acc[date].bananas += scan.bananaCount;
      return acc;
    }, {} as Record<string, { date: string; count: number; bananas: number }>);
    const timelineData = Object.values(scansByDate).slice(-7); // Last 7 days

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
        text: `Total Scans: ${scans.length}\nTotal Bananas: ${totalBananas}\nAverage Confidence: ${averageConfidence}%\nActive Days: ${timelineData.length}`,
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
          ...Object.entries(ripenessBreakdown).map(([ripeness, count]) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(ripeness)] }),
                new TableCell({ children: [new Paragraph(String(count))] }),
              ],
            })
          ),
        ],
      }),
      // Timeline Summary
      new Paragraph({
        text: `Activity Timeline (Last 7 Days)`,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Date")] }),
              new TableCell({ children: [new Paragraph("Scans")] }),
              new TableCell({ children: [new Paragraph("Bananas")] }),
            ],
          }),
          ...timelineData.map(day =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(day.date)] }),
                new TableCell({ children: [new Paragraph(String(day.count))] }),
                new TableCell({ children: [new Paragraph(String(day.bananas))] }),
              ],
            })
          ),
        ],
      }),
      // Main Data Table
      new Paragraph({
        text: `\nDetailed Scan Records`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Date")] }),
              new TableCell({ children: [new Paragraph("Ripeness")] }),
              new TableCell({ children: [new Paragraph("Banana Count")] }),
              new TableCell({ children: [new Paragraph("Confidence")] }),
            ],
          }),
          ...scans.map(scan =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(new Date(scan.timestamp).toLocaleString())] }),
                new TableCell({ children: [new Paragraph(scan.ripeness)] }),
                new TableCell({ children: [new Paragraph(String(scan.bananaCount))] }),
                new TableCell({ children: [new Paragraph(scan.confidence + "%")] }),
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
    const { saveAs } = await import("file-saver");
    saveAs(blob, "farmer-analytics-report.docx");
  };

  const handleExportExcel = () => {
    const now = new Date();
    const exportDate = now.toLocaleString();
    const headers = ["Date", "Ripeness", "Banana Count", "Confidence"];
    const rows = scans.map(scan => [
      new Date(scan.timestamp).toLocaleString(),
      scan.ripeness,
      scan.bananaCount,
      scan.confidence + "%"
    ]);
    const sheetData = [
      ["SagiTech Logo: See attached or visit https://sagitech.com"],
      ["SagiTech - Saba Banana Ripeness and Yield Prediction"],
      ["Exported: " + exportDate],
      ["All data is confidential."],
      [],
      headers,
      ...rows
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");
    XLSX.writeFile(workbook, "farmer-analytics-report.xlsx");
  };

  // Custom tick renderer for XAxis to ensure visibility in all modes
  const renderDateTick = useCallback(
    ({ x, y, payload }) => (
      <text
        x={x}
        y={y + 16}
        textAnchor="middle"
        fontSize={14}
        fontWeight={500}
        style={{ fill: isDarkMode ? '#fff' : '#1e293b' }}
      >
        {payload.value}
      </text>
    ),
    [isDarkMode]
  );

  if (!user) return null;
  if (loading) {
    return (
      <AppLayout title="Analytics" user={user}>
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <span className="ml-4 text-lg text-muted-foreground">Loading analytics...</span>
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Analytics" user={user}>
        <div className="flex flex-col justify-center items-center min-h-[40vh]">
          <span className="text-red-500 text-lg mb-4">{error}</span>
          <GlassButton onClick={() => window.location.reload()} variant="primary">
            Retry
          </GlassButton>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analytics" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard 📊</h1>
            <p className="text-muted-foreground">
              Insights and trends from your banana farming operations
            </p>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GlassButton
                  variant="glass"
                  className="flex items-center gap-2"
                  disabled={scans.length === 0}
                >
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard className="text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{scans.length}</p>
                <p className="text-sm text-muted-foreground">Total Scans</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto">
                <Banana className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalBananas}</p>
                <p className="text-sm text-muted-foreground">Total Bananas</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{averageConfidence}%</p>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{timelineData.length}</p>
                <p className="text-sm text-muted-foreground">Active Days</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ripeness Distribution */}
          <GlassCard>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Ripeness Distribution</h3>
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
                      <RechartsTooltip content={CustomPieTooltip} />
                      <Legend content={CustomPieLegend} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available. Start scanning to see distribution.
                </div>
              )}
            </div>
          </GlassCard>

          {/* Scan Timeline */}
          <GlassCard
            aria-label="Recent Activity Line Chart: Number of scans per day for the last 7 days"
            role="region"
            tabIndex={0}
          >
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              {timelineChartData.length > 0 ? (
                <div
                  ref={chartRef}
                  className={`w-full h-64 transition-opacity duration-700 ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`}
                  tabIndex={0}
                  aria-label="Line chart showing recent scan activity by day"
                  role="img"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={timelineChartData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      onClick={(_, payload) => {
                        if (payload && payload.activeLabel) {
                          const el = document.querySelector(`[data-keyboard-dot='${payload.activeLabel}']`);
                          if (el) (el as HTMLElement).focus();
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0072B2" stopOpacity={0.7}/>
                          <stop offset="50%" stopColor="#009E73" stopOpacity={0.5}/>
                          <stop offset="100%" stopColor="#F0E442" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="bananasGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7}/>
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
                      <XAxis
                        dataKey="date"
                        stroke={isDarkMode ? '#e5e7eb' : '#1e293b'}
                        tick={renderDateTick}
                        interval={timelineChartData.length > 7 ? Math.ceil(timelineChartData.length / 7) - 1 : 0}
                        minTickGap={10}
                        allowDataOverflow={true}
                      />
                      <YAxis stroke={isDarkMode ? '#e5e7eb' : '#1e293b'} tick={{ fontSize: 14, fill: isDarkMode ? '#e5e7eb' : '#1e293b' }} />
                      <RechartsTooltip content={CustomLineTooltip} />
                      <Legend content={CustomLineLegend} />
                      <Line
                        type="monotone"
                        dataKey="scans"
                        stroke="#0072B2"
                        name="Scans"
                        strokeWidth={3}
                        dot={({ cx, cy, payload, index }) => (
                          <circle
                            key={payload.date || index} // Added key prop for React warning
                            cx={cx}
                            cy={cy}
                            r={chartVisible ? 5 : 0}
                            fill="#0072B2"
                            stroke={isDarkMode ? '#22292f' : '#fff'}
                            strokeWidth={2}
                            tabIndex={0}
                            data-keyboard-dot={payload.date}
                            aria-label={`Scans on ${payload.date}: ${payload.scans}`}
                            style={{
                              transition: 'r 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                              transitionDelay: `${index * 80}ms`,
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                toast && toast({ title: `Scans on ${payload.date}`, description: `${payload.scans} scans` });
                              }
                            }}
                          />
                        )}
                        activeDot={{ r: 7 }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease"
                      />
                      <Line
                        type="monotone"
                        dataKey="bananas"
                        stroke="#fbbf24"
                        name="Bananas"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease"
                      />
                      <Area
                        type="monotone"
                        dataKey="scans"
                        fill="url(#scansGradient)"
                        fillOpacity={1}
                        isAnimationActive={true}
                        animationDuration={1400}
                        animationEasing="ease-out"
                      />
                      <Area
                        type="monotone"
                        dataKey="bananas"
                        fill="url(#bananasGradient)"
                        fillOpacity={1}
                        isAnimationActive={true}
                        animationDuration={1400}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {timelineChartData.length > 14 && (
                    <div className="text-xs text-muted-foreground mt-2">Tip: Zoom or pan to see more days (coming soon)</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity to display.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Performance Insights */}
          <GlassCard>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Performance Insights</h3>
              
              <div className="space-y-3">
                {scans.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-glass-border">
                      <span className="text-sm text-muted-foreground">Highest Confidence</span>
                      <span className="font-medium text-foreground">
                        {Math.max(...scans.map(s => s.confidence))}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-glass-border">
                      <span className="text-sm text-muted-foreground">Lowest Confidence</span>
                      <span className="font-medium text-foreground">
                        {Math.min(...scans.map(s => s.confidence))}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-glass-border">
                      <span className="text-sm text-muted-foreground">Most Common Stage</span>
                      <span className="font-medium text-foreground">
                        {Object.entries(ripenessBreakdown).reduce((a, b) => ripenessBreakdown[a[0]] > ripenessBreakdown[b[0]] ? a : b)[0]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Avg Bananas per Scan</span>
                      <span className="font-medium text-foreground">
                        {(totalBananas / scans.length).toFixed(1)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No data available yet.</p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Recommendations */}
          <GlassCard className="bg-primary-glass border-primary/30">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
              
              <div className="space-y-3 text-sm">
                {scans.length === 0 ? (
                  <p className="text-foreground">Start scanning your bananas to get personalized recommendations!</p>
                ) : (
                  <>
                    {averageConfidence < 80 && (
                      <div className="p-3 bg-warning/20 border border-warning/30 rounded-lg">
                        <p className="text-foreground">💡 Consider improving image quality for higher confidence scores</p>
                      </div>
                    )}
                    
                    {Object.keys(ripenessBreakdown).length < 3 && (
                      <div className="p-3 bg-primary/20 border border-primary/30 rounded-lg">
                        <p className="text-foreground">📈 Scan bananas at different ripeness stages for better insights</p>
                      </div>
                    )}
                    
                    <div className="p-3 bg-success/20 border border-success/30 rounded-lg">
                      <p className="text-foreground">✅ Regular scanning helps optimize harvest timing</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
};