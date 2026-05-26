import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Home, DollarSign, Hammer, ArrowRight, ShieldAlert } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import Logo from '@/components/Logo';
import DtiCalculator from '@/components/toolkit/DtiCalculator';
import HomeAffordabilityCalculator from '@/components/toolkit/HomeAffordabilityCalculator';
import CapitalGainsTaxCalculator from '@/components/toolkit/CapitalGainsTaxCalculator';
import ExchangeCalculator from '@/components/toolkit/ExchangeCalculator';
import RehabEstimator from '@/components/toolkit/RehabEstimator';
import ArvCalculator from '@/components/toolkit/ArvCalculator';
import StressTestCalculator from '@/components/toolkit/StressTestCalculator';

export default function InvestorToolkit() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" data-testid="page-investor-toolkit">
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <a href="/" data-testid="link-home">
                <Logo className="h-10 w-auto" />
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => setLocation('/')}
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button
                className="btn-gradient-purple"
                onClick={() => setLocation('/pricing')}
                data-testid="button-signup"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="py-16 px-4 sm:px-6 lg:px-8 hero-glow relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">All Tools Free - No Sign Up Required</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-white animate-fade-in">
            Investor Toolkit
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in">
            Free calculators and tools to help you make smarter real estate investment decisions
          </p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="buying-power" className="w-full">
            <TabsList className="w-full flex mb-8 bg-gray-800/50 border border-gray-700/50 p-1 rounded-md" data-testid="tabs-list">
              <TabsTrigger
                value="buying-power"
                className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                data-testid="tab-buying-power"
              >
                <DollarSign className="w-4 h-4" />
                Buying Power
              </TabsTrigger>
              <TabsTrigger
                value="tax-planning"
                className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                data-testid="tab-tax-planning"
              >
                <Calculator className="w-4 h-4" />
                Tax Planning
              </TabsTrigger>
              <TabsTrigger
                value="renovation"
                className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
                data-testid="tab-renovation"
              >
                <Hammer className="w-4 h-4" />
                Renovation
              </TabsTrigger>
              <TabsTrigger
                value="stress-test"
                className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
                data-testid="tab-stress-test"
              >
                <ShieldAlert className="w-4 h-4" />
                Stress Test
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buying-power" className="space-y-8" data-testid="content-buying-power">
              <DtiCalculator />
              <HomeAffordabilityCalculator />
            </TabsContent>

            <TabsContent value="tax-planning" className="space-y-8" data-testid="content-tax-planning">
              <CapitalGainsTaxCalculator />
              <ExchangeCalculator />
            </TabsContent>

            <TabsContent value="renovation" className="space-y-8" data-testid="content-renovation">
              <RehabEstimator />
              <ArvCalculator />
            </TabsContent>

            <TabsContent value="stress-test" className="space-y-8" data-testid="content-stress-test">
              <StressTestCalculator />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 hero-glow relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Want deeper analysis with real market data?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Try ScoreCasa's full property analysis.
          </p>
          <Button
            size="lg"
            className="btn-gradient-purple"
            onClick={() => setLocation('/demo')}
            data-testid="button-analyze-property"
          >
            Analyze a Property
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-gray-800 glass">
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
              <a href="https://www.tiktok.com/@scorecasa" target="_blank" rel="noopener noreferrer" aria-label="Visit our TikTok page" className="text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-md" data-testid="link-tiktok">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/privacy" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <span className="text-gray-700">&bull;</span>
              <a href="/terms" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-gray-700">&bull;</span>
              <a href="/contact" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-contact">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-gray-600">
              This tool provides data-driven insights to support your decisions, not financial advice.
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
