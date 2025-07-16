import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Banana, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types";
import { authService } from "@/utils/authService";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const tokens = await authService.login({
        email: formData.email,
        password: formData.password,
      });
      if (!tokens || !tokens.access) {
        toast({
          title: "Login failed",
          description: "Invalid email or password.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Fetch user profile info using the access token
      const userRes = await fetch("http://localhost:8000/api/profiles/me/", {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      if (!userRes.ok) {
        toast({
          title: "Login failed",
          description: "Could not fetch user profile.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      const user = await userRes.json();

      // Flatten user object and set a 'name' field for display
      let name = "";
      if (user.user) {
        if (user.user.first_name || user.user.last_name) {
          name = `${user.user.first_name || ''} ${user.user.last_name || ''}`.trim();
        } else if (user.user.username) {
          name = user.user.username;
        }
      }
      const userForStorage = {
        ...user,
        name,
        email: user.user?.email,
        id: user.user?.id,
        role: user.role,
        username: user.user?.username,
        first_name: user.user?.first_name,
        last_name: user.user?.last_name,
      };

      // Store user and tokens in localStorage
      localStorage.setItem("sagitech-user", JSON.stringify(userForStorage));
      localStorage.setItem("sagitech-tokens", JSON.stringify(tokens));
      localStorage.setItem("sagitech-token", tokens.access); // <-- Add this line

      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.role}`,
      });
      const redirectPath = user.role === "admin"
        ? "/dashboard/admin"
        : "/dashboard/farmer";
      navigate(redirectPath);
    } catch (err) {
      // Do not show a duplicate toast here; authService.login already handles it
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-0">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          
          <div className="flex items-center justify-center gap-3">
            <img
              src="/SagiTech_Logo.svg"
              alt="SagiTech Logo"
              className="h-32 md:h-36 w-auto object-contain drop-shadow-md my-0 max-w-[280px] md:max-w-[340px]"
              draggable={false}
            />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your farming dashboard</p>
          </div>
        </div>

        {/* Login Form */}
        <GlassCard>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="farmer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 glass text-foreground border border-input placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 glass text-foreground border border-input placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="accent-primary h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="rememberMe" className="text-foreground cursor-pointer select-none">Remember Me</Label>
              </div>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </GlassButton>
          </form>

          <div className="pt-6 border-t border-glass-border">
            <p className="text-center text-sm text-muted-foreground">
              New to SagiTech?{" "}
              <Link to="/register" className="text-primary hover:text-primary-hover font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};