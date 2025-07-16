import { NavLink } from "react-router-dom";
import { 
  Home, 
  Camera, 
  History, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft,
  Banana,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./ui/GlassCard";
import { User } from "@/types";
import { useNavigate } from "react-router-dom";
import { GlassButton } from "./ui/GlassButton";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface SidebarProps {
  user: User | null;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ user, isCollapsed, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const farmerNavItems = [
    { to: "/dashboard/farmer", icon: Home, label: "Overview" },
    { to: "/dashboard/farmer/scan", icon: Camera, label: "Scan Bananas" },
    { to: "/dashboard/farmer/history", icon: History, label: "History" },
    { to: "/dashboard/farmer/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const adminNavItems = [
    { to: "/dashboard/admin", icon: Home, label: "Overview" },
    { to: "/dashboard/admin/users", icon: Users, label: "Manage Users" },
    { to: "/dashboard/admin/analytics", icon: BarChart3, label: "System Analytics" },
    { to: "/dashboard/admin/settings", icon: Settings, label: "Settings" },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : farmerNavItems;

  const handleLogout = () => {
    localStorage.removeItem("sagitech-user");
    toast && toast({ title: "Logged out", description: "You have been logged out." });
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <GlassCard className="h-full rounded-none rounded-r-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-glass-border flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Banana className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gradient">SagiTech</h2>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-primary-glass transition-colors"
          >
            <ChevronLeft 
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )} 
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-primary-glass hover:border-primary/30",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "text-foreground",
                  isCollapsed && "justify-center"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="glass rounded-lg p-3 space-y-3">
              <div>
                <p className="font-medium text-sm text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <GlassButton
                variant="glass"
                className="w-full flex items-center gap-2 mt-2"
                onClick={() => setShowLogoutModal(true)}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <GlassCard className="max-w-sm w-full p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">Confirm Logout</h2>
              <p className="text-muted-foreground">Are you sure you want to logout?</p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlassButton
                variant="glass"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => { setShowLogoutModal(false); handleLogout(); }}
              >
                Yes, Logout
              </GlassButton>
              <GlassButton variant="glass" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </aside>
  );
};