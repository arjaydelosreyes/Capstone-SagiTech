import { useState, ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { User } from "@/types";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  user: User | null;
}

export const AppLayout = ({ children, title, user }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar 
        title={title} 
        onToggleSidebar={toggleSidebar}
        showSidebarToggle={!!user}
      />
      
      {user && (
        <Sidebar
          user={user}
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      )}

      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          user ? (sidebarCollapsed ? "ml-20" : "ml-64") : "ml-0"
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};