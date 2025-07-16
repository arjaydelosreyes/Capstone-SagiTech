import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Database, Shield, Bell, Download, Upload, Save, RefreshCw } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { User } from "@/types";
import { toast } from "@/hooks/use-toast";

export const AdminSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState({
    system: {
      siteName: "SagiTech",
      maxFileSize: "10",
      sessionTimeout: "60",
      maintenanceMode: false,
      autoBackup: true,
      debugMode: false
    },
    ai: {
      confidenceThreshold: "70",
      maxBananasPerScan: "20",
      modelVersion: "v2.1.4",
      enableBatchProcessing: true,
      enableAdvancedAnalytics: true
    },
    notifications: {
      emailNotifications: true,
      systemAlerts: true,
      userRegistrations: true,
      errorReports: true,
      weeklyReports: false
    },
    security: {
      enforceStrongPasswords: true,
      enableTwoFactor: false,
      sessionSecurity: true,
      ipWhitelisting: false,
      auditLogging: true
    }
  });

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

  const handleSave = () => {
    // Simulate saving settings
    localStorage.setItem("sagitech-admin-settings", JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "System configuration has been updated successfully.",
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'sagitech-settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Settings Exported",
      description: "Configuration file has been downloaded.",
    });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      // Reset to default settings
      setSettings({
        system: {
          siteName: "SagiTech",
          maxFileSize: "10",
          sessionTimeout: "60",
          maintenanceMode: false,
          autoBackup: true,
          debugMode: false
        },
        ai: {
          confidenceThreshold: "70",
          maxBananasPerScan: "20",
          modelVersion: "v2.1.4",
          enableBatchProcessing: true,
          enableAdvancedAnalytics: true
        },
        notifications: {
          emailNotifications: true,
          systemAlerts: true,
          userRegistrations: true,
          errorReports: true,
          weeklyReports: false
        },
        security: {
          enforceStrongPasswords: true,
          enableTwoFactor: false,
          sessionSecurity: true,
          ipWhitelisting: false,
          auditLogging: true
        }
      });
      
      toast({
        title: "Settings Reset",
        description: "All settings have been restored to default values.",
      });
    }
  };

  if (!user) return null;

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

        {/* System Configuration */}
        <GlassCard>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">System Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.system.siteName}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, siteName: e.target.value }
                  })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={settings.system.maxFileSize}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, maxFileSize: e.target.value }
                  })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.system.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, sessionTimeout: e.target.value }
                  })}
                  className="glass"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  <Switch
                    id="maintenanceMode"
                    checked={settings.system.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      system: { ...settings.system, maintenanceMode: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoBackup">Auto Backup</Label>
                  <Switch
                    id="autoBackup"
                    checked={settings.system.autoBackup}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      system: { ...settings.system, autoBackup: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="debugMode">Debug Mode</Label>
                  <Switch
                    id="debugMode"
                    checked={settings.system.debugMode}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      system: { ...settings.system, debugMode: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* AI Configuration */}
        <GlassCard>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Database className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">AI Model Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="confidenceThreshold">Confidence Threshold (%)</Label>
                <Input
                  id="confidenceThreshold"
                  type="number"
                  min="50"
                  max="100"
                  value={settings.ai.confidenceThreshold}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, confidenceThreshold: e.target.value }
                  })}
                  className="glass"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence level for scan results
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxBananasPerScan">Max Bananas per Scan</Label>
                <Input
                  id="maxBananasPerScan"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.ai.maxBananasPerScan}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, maxBananasPerScan: e.target.value }
                  })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelVersion">Model Version</Label>
                <Input
                  id="modelVersion"
                  value={settings.ai.modelVersion}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, modelVersion: e.target.value }
                  })}
                  className="glass"
                  readOnly
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableBatchProcessing">Batch Processing</Label>
                  <Switch
                    id="enableBatchProcessing"
                    checked={settings.ai.enableBatchProcessing}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      ai: { ...settings.ai, enableBatchProcessing: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enableAdvancedAnalytics">Advanced Analytics</Label>
                  <Switch
                    id="enableAdvancedAnalytics"
                    checked={settings.ai.enableAdvancedAnalytics}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      ai: { ...settings.ai, enableAdvancedAnalytics: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Security & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Security Settings */}
          <GlassCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'enforceStrongPasswords', label: 'Enforce Strong Passwords', desc: 'Require complex passwords for all users' },
                  { key: 'enableTwoFactor', label: 'Two-Factor Authentication', desc: 'Enable 2FA for admin accounts' },
                  { key: 'sessionSecurity', label: 'Enhanced Session Security', desc: 'Additional session validation' },
                  { key: 'ipWhitelisting', label: 'IP Whitelisting', desc: 'Restrict access to specific IPs' },
                  { key: 'auditLogging', label: 'Audit Logging', desc: 'Log all system access and changes' }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key}>{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        id={item.key}
                        checked={settings.security[item.key as keyof typeof settings.security] as boolean}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          security: { ...settings.security, [item.key]: checked }
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Notification Settings */}
          <GlassCard>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Bell className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Notification Settings</h3>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send system notifications via email' },
                  { key: 'systemAlerts', label: 'System Alerts', desc: 'Critical system status notifications' },
                  { key: 'userRegistrations', label: 'User Registrations', desc: 'Notify on new user signups' },
                  { key: 'errorReports', label: 'Error Reports', desc: 'Automatic error reporting' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Weekly analytics summaries' }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key}>{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        id={item.key}
                        checked={settings.notifications[item.key as keyof typeof settings.notifications] as boolean}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, [item.key]: checked }
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Maintenance Tools */}
        <GlassCard className="bg-warning/10 border-warning/30">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Maintenance Tools</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassButton variant="glass" className="flex items-center gap-2 justify-center">
                <Database className="h-4 w-4" />
                Backup Database
              </GlassButton>
              
              <GlassButton variant="glass" className="flex items-center gap-2 justify-center">
                <RefreshCw className="h-4 w-4" />
                Clear Cache
              </GlassButton>
              
              <GlassButton variant="glass" className="flex items-center gap-2 justify-center">
                <Upload className="h-4 w-4" />
                Import Settings
              </GlassButton>
            </div>

            <div className="p-4 bg-warning/20 border border-warning/30 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">⚠️ Maintenance Notice</p>
              <p className="text-xs text-muted-foreground">
                Changes to critical settings may require system restart. Always backup before making major modifications.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};