import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Eye, Calendar, Banana, Download } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { User, ScanResult } from "@/types";
import { getRipenessBadgeClass } from "@/utils/analyzeBanana";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/utils/authService";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, WidthType, ImageRun } from "docx";
import * as XLSX from "xlsx";

export const FarmerHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [filteredScans, setFilteredScans] = useState<ScanResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [ripenessFilter, setRipenessFilter] = useState<string>("all");
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const userData = localStorage.getItem("sagitech-user");
    const token = localStorage.getItem("sagitech-token");
    if (userData && token) {
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
          setFilteredScans(normalizedScans);
          setLoading(false);
        })
        .catch(() => {
          setScans([]);
          setFilteredScans([]);
          setError("Failed to load scan history. Please try again.");
          setLoading(false);
        });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    let filtered = scans;

    // Filter by ripeness
    if (ripenessFilter !== "all") {
      filtered = filtered.filter(scan => scan.ripeness === ripenessFilter);
    }

    // Filter by search term (you could extend this to search by date, etc.)
    if (searchTerm) {
      filtered = filtered.filter(scan => 
        scan.ripeness.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(scan.timestamp).toLocaleDateString().includes(searchTerm)
      );
    }

    setFilteredScans(filtered);
  }, [scans, searchTerm, ripenessFilter]);

  const ripenessOptions = [
    { value: "all", label: "All Stages" },
    { value: "Not Mature", label: "Not Mature" },
    { value: "Mature", label: "Mature" },
    { value: "Ripe", label: "Ripe" },
    { value: "Over Ripe", label: "Over Ripe" }
  ];

  // CSV export logic
  const handleExportCSV = () => {
    if (filteredScans.length === 0) return;
    const headers = ["Date", "Ripeness", "Banana Count", "Confidence"];
    const rows = filteredScans.map(scan => [
      new Date(scan.timestamp).toLocaleString(),
      scan.ripeness,
      scan.bananaCount,
      scan.confidence + "%"
    ]);
    const branding = "SagiTech - Saba Banana Ripeness and Yield Prediction";
    const exportTime = "Exported: " + new Date().toLocaleString();
    const note = "All data is confidential.";
    const csvContent = [
      branding,
      exportTime,
      note,
      "", // Empty row for spacing
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `banana-scan-history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "CSV file has been downloaded." });
  };

  const handleExportWord = async () => {
    // Fetch the logo as base64
    const logoUrl = "/SagiTech_Logo.png";
    const toBase64 = (url: string) => fetch(url)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
    const logoBase64 = await toBase64(logoUrl);
    const logoData = logoBase64.split(",")[1];

    const now = new Date();
    const exportDate = now.toLocaleString();

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: Uint8Array.from(atob(logoData), c => c.charCodeAt(0)),
                  type: "png",
                  transformation: { width: 120, height: 120 },
                })
              ],
              alignment: "center"
            }),
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
                ...filteredScans.map(scan =>
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
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "banana-scan-history.docx");
  };

  const handleExportExcel = () => {
    const now = new Date();
    const exportDate = now.toLocaleString();
    const headers = ["Date", "Ripeness", "Banana Count", "Confidence"];
    const rows = filteredScans.map(scan => [
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scan History");
    XLSX.writeFile(workbook, "banana-scan-history.xlsx");
  };

  if (!user) return null;
  if (loading) {
    return (
      <AppLayout title="Scan History" user={user}>
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <span className="ml-4 text-lg text-muted-foreground">Loading scan history...</span>
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Scan History" user={user}>
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
    <AppLayout title="Scan History" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Scan History 📋</h1>
          <p className="text-muted-foreground">
            Review and analyze your previous banana scan results
          </p>
        </div>

        {/* Filters */}
        <GlassCard>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass"
                />
              </div>
            </div>
            <div className="md:w-48 w-full">
              <Select value={ripenessFilter} onValueChange={setRipenessFilter}>
                <SelectTrigger className="glass">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ripenessOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        </GlassCard>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard className="text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Scans</p>
              <p className="text-2xl font-bold text-foreground">{filteredScans.length}</p>
            </div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Bananas</p>
              <p className="text-2xl font-bold text-foreground">
                {filteredScans.reduce((total, scan) => total + scan.bananaCount, 0)}
              </p>
            </div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <p className="text-2xl font-bold text-foreground">
                {filteredScans.length > 0 
                  ? Math.round(filteredScans.reduce((total, scan) => total + scan.confidence, 0) / filteredScans.length)
                  : 0}%
              </p>
            </div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Latest Scan</p>
              <p className="text-sm font-medium text-foreground">
                {filteredScans.length > 0 
                  ? new Date(filteredScans[0].timestamp).toLocaleDateString()
                  : "No scans"}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Scan Results */}
        {filteredScans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScans.map((scan) => (
              <GlassCard key={scan.id} className="cursor-pointer" onClick={() => setSelectedScan(scan)}>
                <div className="space-y-4">
                  <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden">
                    <img
                      src={scan.image}
                      alt="Scanned banana"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getRipenessBadgeClass(scan.ripeness)}`}>
                        {scan.ripeness}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {scan.confidence}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Banana className="h-4 w-4" />
                        <span>{scan.bananaCount} banana{scan.bananaCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <GlassButton variant="glass" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </GlassButton>
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
                <h3 className="font-medium text-foreground">No scans found</h3>
                <p className="text-sm text-muted-foreground">
                  {scans.length === 0 
                    ? "Start by scanning your first batch of bananas" 
                    : "Try adjusting your filters"}
                </p>
              </div>
              {scans.length === 0 && (
                <GlassButton
                  variant="primary"
                  onClick={() => navigate("/dashboard/farmer/scan")}
                >
                  Start Scanning
                </GlassButton>
              )}
            </div>
          </GlassCard>
        )}

        {/* Detail Modal */}
        {selectedScan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Scan Details</h3>
                  <GlassButton
                    variant="glass"
                    size="sm"
                    onClick={() => setSelectedScan(null)}
                  >
                    ✕
                  </GlassButton>
                </div>

                <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden">
                  <img
                    src={selectedScan.image}
                    alt="Scanned banana"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ripeness</label>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getRipenessBadgeClass(selectedScan.ripeness)}`}>
                      {selectedScan.ripeness}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confidence</label>
                    <p className="text-lg font-semibold text-foreground">{selectedScan.confidence}%</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Banana Count</label>
                    <p className="text-lg font-semibold text-foreground">{selectedScan.bananaCount}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Date</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedScan.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </AppLayout>
  );
};