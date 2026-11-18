import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, TrendingUp, ArrowLeft, Lightbulb as Sparkles, CreditCard } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import Logo from '@/components/Logo';

export default function Pricing() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please log in to choose a plan",
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  }, [isLoading, isAuthenticated, toast]);

  const handlePurchaseCredits = async (packageType: 'starter' | 'advanced') => {
    try {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', { package: packageType });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-glow">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/')} 
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {isAuthenticated && (
                <Button 
                  className="btn-outline-cyan"
                  onClick={() => window.location.href = '/api/logout'} 
                  data-testid="button-logout"
                >
                  Log Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 hero-glow relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-6">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">Secure Checkout</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">
              Buy report credits
            </h2>
            <p className="text-lg text-gray-400">
              One credit = one full property report · No subscription · Credits never expire
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <Card className="relative glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gradient-cyan metric-score">$10</span>
                  <span className="text-gray-400"> one-time</span>
                </div>
                <CardDescription className="mt-4 text-gray-400">
                  For comparing a few homes you’re serious about
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-white">5 property reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">Schools, safety, flood risk, prices and rents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">Investment Grade (A-F) rating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">Market Timing signals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">Buy vs Rent analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-cyan-400" />
                    <span className="text-gray-300">Sources listed for every number</span>
                  </li>
                </ul>
                <Button 
                  className="w-full btn-outline-cyan" 
                  onClick={() => handlePurchaseCredits('starter')}
                  data-testid="button-select-starter"
                >
                  Buy 5 Credits
                </Button>
              </CardContent>
            </Card>

            {/* Plus */}
            <Card className="relative glass-card card-glow-hover border-cyan-500/50 glow-cyan-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-purple-400 text-gray-950 border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white">Plus</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gradient-purple metric-score">$20</span>
                  <span className="text-gray-400"> one-time</span>
                </div>
                <CardDescription className="mt-4 text-gray-400">
                  For weighing several neighborhoods or a small portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-white">12 property reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Schools, safety, flood risk, prices and rents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Investment Grade (A-F) rating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Market Timing signals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Buy vs Rent & Affordability</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Sources listed for every number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Priority support</span>
                  </li>
                </ul>
                <Button 
                  className="w-full btn-gradient-purple" 
                  onClick={() => handlePurchaseCredits('advanced')}
                  data-testid="button-select-advanced"
                >
                  Buy 12 Credits
                </Button>
              </CardContent>
            </Card>
          </div>

          {user && user.creditBalance !== undefined && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full">
                <span className="text-gray-400">Current balance:</span>
                <span className="font-semibold text-cyan-400">{user.creditBalance} credits</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 glass mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-6">
              <a href="https://www.facebook.com/profile.php?id=61584350274435" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-facebook">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-purple-400 transition-colors p-2 rounded-md" data-testid="link-instagram">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/ScoreCasa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-x">
                <FaXTwitter className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <span className="text-gray-700">•</span>
              <a href="/terms" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-gray-700">•</span>
              <a href="/contact" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-contact">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-gray-600">
              ScoreCasa is a research tool, not financial, legal or real estate advice.
            </p>
            <p className="text-sm text-gray-500">
              &copy; 2025 ScoreCasa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
