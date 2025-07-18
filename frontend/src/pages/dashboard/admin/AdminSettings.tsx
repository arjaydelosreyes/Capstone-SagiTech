import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Download, Save, RefreshCw } from "lucide-react";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/utils/adminApi";

const categoryDescriptions: Record<string, string> = {
  system: "Core platform configuration and operational settings.",
  ai: "Settings related to AI model and analysis.",
  notifications: "Notification and alert preferences.",
  security: "Security and audit controls.",
};

const settingDescriptions: Record<string, string> = {
  site_name: "The name displayed throughout the SagiTech platform.",
  max_file_size: "Maximum upload size for scan images (in MB).",
  maintenance_mode: "Enable to temporarily disable user access for maintenance.",
  confidence_threshold: "Minimum confidence level for AI scan results.",
  model_version: "Current version of the AI model in use.",
  email_notifications: "Enable or disable system email notifications.",
  audit_logging: "Log all system access and changes for security.",
};

const valueHints: Record<string, string> = {
  max_file_size: "MB",
  confidence_threshold: "%",
};

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const AdminSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
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
    adminApi.getSettingsByCategory()
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to fetch settings." });
        setLoading(false);
      });
  }, []);

  const handleSettingChange = (category: string, id: number, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: prev[category].map((setting: any) =>
        setting.id === id ? { ...setting, value } : setting
      ),
    }));
  };

  const handleSave = async () => {
    try {
      for (const category in settings) {
        for (const setting of settings[category]) {
          await adminApi.updateSetting(setting.id, setting);
        }
      }
      toast({ title: "Settings Saved", description: "System configuration updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save settings." });
    }
  };

  // Replace handleExport with robust Word export logic
  const handleExport = async () => {
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
      })
    );
    // Add settings by category
    Object.entries(settings).forEach(([category, settingsList]: [string, any[]]) => {
      children.push(
        new Paragraph({
          text: `${category.charAt(0).toUpperCase() + category.slice(1)} Settings`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Key")] }),
                new TableCell({ children: [new Paragraph("Value")] }),
                new TableCell({ children: [new Paragraph("Description")] }),
              ],
            }),
            ...settingsList.map(setting =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(formatLabel(setting.key))] }),
                  new TableCell({ children: [new Paragraph(String(setting.value))] }),
                  new TableCell({ children: [new Paragraph(settingDescriptions[setting.key] || "")] }),
                ],
              })
            ),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          children,
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "sagitech-settings.docx");
    toast({ title: "Settings Exported", description: "Word configuration file has been downloaded." });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      window.location.reload(); // Reload to fetch defaults from backend
    }
  };

  if (!user) return null;
  if (loading) return <div>Loading...</div>;

  return (
    <AppLayout title="System Settings" user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">System Settings ⚙️</h1>
            <p className="text-muted-foreground">
              Configure platform settings and system parameters
            </p>
          </div>
          <div className="flex gap-2">
            <GlassButton variant="glass" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </GlassButton>
            <GlassButton variant="glass" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </GlassButton>
            <GlassButton variant="primary" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </GlassButton>
          </div>
        </div>

        {/* Dynamic Settings by Category */}
        {Object.entries(settings).map(([category, settingsList]: [string, any[]]) => (
          <GlassCard key={category} className="mb-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground capitalize">{formatLabel(category)} Settings</h3>
                  {categoryDescriptions[category] && (
                    <p className="text-xs text-muted-foreground mt-1">{categoryDescriptions[category]}</p>
                  )}
                </div>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settingsList.map((setting: any) => (
                  <div className="space-y-2" key={setting.id}>
                    <Label htmlFor={setting.key}>{formatLabel(setting.key)}</Label>
                    {settingDescriptions[setting.key] && (
                      <p className="text-xs text-muted-foreground mb-1">{settingDescriptions[setting.key]}</p>
                    )}
                    {setting.data_type === 'boolean' ? (
                      <Switch
                        id={setting.key}
                        checked={setting.value === true || setting.value === 'true'}
                        onCheckedChange={checked => handleSettingChange(category, setting.id, checked)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          id={setting.key}
                          type={setting.data_type === 'integer' || setting.data_type === 'float' ? 'number' : 'text'}
                          value={setting.value}
                          onChange={e => handleSettingChange(category, setting.id, e.target.value)}
                          className="glass"
                        />
                        {valueHints[setting.key] && (
                          <span className="text-xs text-muted-foreground">{valueHints[setting.key]}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppLayout>
  );
};