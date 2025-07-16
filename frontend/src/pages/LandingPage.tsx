import { ArrowRight, Camera, BarChart3, Users, Banana, Brain, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

export const LandingPage = () => {
  const features = [
    {
      icon: Camera,
      title: "AI-Powered Scanning",
      description: "Upload or capture banana images for instant ripeness detection using advanced CNN technology."
    },
    {
      icon: Target,
      title: "Precise Classification",
      description: "Accurately identifies four ripeness stages: Not Mature, Mature, Ripe, and Over Ripe."
    },
    {
      icon: BarChart3,
      title: "Yield Analytics",
      description: "Track banana counts, monitor trends, and optimize your farming decisions with detailed insights."
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Dedicated dashboards for farmers and administrators with tailored functionality."
    }
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="glass border-b border-glass-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/SagiTech_Logo.svg"
                alt="SagiTech Logo"
                className="h-12 md:h-16 w-auto object-contain drop-shadow-md my-0 max-w-[160px] md:max-w-[240px]"
                draggable={false}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/login">
                <GlassButton variant="glass">Login</GlassButton>
              </Link>
              <Link to="/register">
                <GlassButton variant="primary">Get Started</GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              AI-Powered Saba Banana
              <span className="text-gradient block">Ripeness Detection</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Revolutionize your farming with SagiTech's advanced CNN technology. 
              Instantly analyze banana ripeness and count yields with industry-leading accuracy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <GlassButton variant="primary" size="lg" className="flex items-center gap-2">
                Start Scanning <ArrowRight className="h-5 w-5" />
              </GlassButton>
            </Link>
            <GlassButton variant="glass" size="lg" className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Learn About AI
            </GlassButton>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 relative">
          <GlassCard className="max-w-4xl mx-auto p-8">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-4">
                <Camera className="h-16 w-16 mx-auto text-primary" />
                <p className="text-lg font-medium text-foreground">
                  Interactive Banana Scanner Demo
                </p>
                <p className="text-muted-foreground">
                  Experience real-time AI detection in action
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-foreground">
              Powerful Features for Modern Farming
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to optimize your banana farming operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <GlassCard key={index} className="text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <GlassCard className="text-center space-y-8 p-12">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to Transform Your Farming?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of farmers using SagiTech to optimize their banana production
          </p>
          <Link to="/register">
            <GlassButton variant="primary" size="lg" className="flex items-center gap-2 mx-auto">
              Create Your Account <ArrowRight className="h-5 w-5" />
            </GlassButton>
          </Link>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-glass-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">
              © 2025 SagiTech. Empowering farmers with AI technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};