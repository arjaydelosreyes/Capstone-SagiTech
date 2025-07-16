import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon, Banana, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types";
import { authService } from "@/utils/authService";
import zxcvbn from "zxcvbn";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Only allow farmer registration
      const user = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast({
        title: "Account created!",
        description: "Registration successful. Please log in to continue.",
      });
      navigate("/login");
    } catch (err) {
      // Do not show a duplicate toast here; authService.register already handles it
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });
    const result = zxcvbn(value);
    setPasswordScore(result.score);
    setPasswordFeedback(result.feedback.suggestions.join(" "));
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
            <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground">Join the AI farming revolution</p>
          </div>
        </div>

        {/* Registration Form */}
        <GlassCard>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 glass text-foreground border border-input placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

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
                <div className="relative flex items-center h-12">
                  <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="pl-10 pr-10 glass text-foreground border border-input placeholder:text-muted-foreground h-full"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="h-2 w-full rounded bg-muted overflow-hidden mb-1">
                      <div
                        className={`h-2 rounded transition-all duration-300 ${
                          passwordScore === 0 ? "bg-red-500 w-1/5" :
                          passwordScore === 1 ? "bg-orange-500 w-2/5" :
                          passwordScore === 2 ? "bg-yellow-500 w-3/5" :
                          passwordScore === 3 ? "bg-blue-500 w-4/5" :
                          "bg-green-500 w-full"
                        }`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formData.password.length < 8 && (
                        <span className="text-red-500">Password must be at least 8 characters. </span>
                      )}
                      {passwordScore < 3 && formData.password.length >= 8 && (
                        <span className="text-orange-500">{passwordFeedback || "Password could be stronger."}</span>
                      )}
                      {passwordScore >= 3 && formData.password.length >= 8 && (
                        <span className="text-green-600">Strong password!</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10 glass text-foreground border border-input placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-primary-glass border border-primary/30 rounded-lg p-3">
              <p className="text-sm text-foreground">
                <strong>Note:</strong> Farmer accounts only. Admin accounts are created through the Django admin panel.
              </p>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </GlassButton>
          </form>

          <div className="pt-6 border-t border-glass-border">
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};