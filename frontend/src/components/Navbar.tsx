import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { GlassButton } from "./ui/GlassButton";

interface NavbarProps {
  title: string;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export const Navbar = ({ title, onToggleSidebar, showSidebarToggle = false }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {showSidebarToggle && onToggleSidebar && (
            <GlassButton
              onClick={onToggleSidebar}
              size="sm"
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </GlassButton>
          )}
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <GlassButton
            onClick={toggleTheme}
            size="sm"
            className="p-2"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </GlassButton>
        </div>
      </div>
    </nav>
  );
};