import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, MapPin, DollarSign, TrendingUp, Users, GraduationCap, 
  Shield, Footprints, BarChart3, Database, CheckCircle2, HelpCircle,
  AlertCircle, Target, Gift, Sparkles, Calculator, Building2,
  Droplets, Activity, Wind
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/Logo';

export default function Landing() {
  const [, setLocation] = useLocation();

  const { data: earlyBirdStats } = useQuery<{
    totalUsers: number;
    earlyBirdCount: number;
    spotsRemaining: number;
  }>({
    queryKey: ['/api/early-bird/stats'],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen">
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
                className="text-white/80"
                onClick={() => setLocation('/toolkit')} 
                data-testid="button-toolkit"
              >
                Free Tools
              </Button>
              <Button 
                variant="ghost" 
                className="text-white/80"
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

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 hero-glow relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">AI-Powered Property Intelligence</span>
          </div>
          
          {/* Hero icon with glow */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl scale-150"></div>
              <div className="relative p-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 pulse-glow">
                <Home className="w-16 h-16 text-cyan-400 icon-glow" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight animate-fade-in">
            See What Your <span className="text-gradient-cyan">Investment</span> Will Be Worth <span className="text-gradient-purple">Next Year</span>
          </h1>
          <p className="text-xl text-gray-400 mb-4 max-w-3xl mx-auto animate-fade-in">
            Get 1-year home value forecasts, rent projections, and market velocity data before you buy. Whether you're a <span className="text-cyan-400 font-medium">first-time homebuyer</span> wanting to feel confident you're not overpaying, or a seasoned <span className="text-purple-400 font-medium">real estate investor</span> hunting for strong rental yield and appreciation — we give you the same institutional-grade intelligence, tailored to your goals.
          </p>
          <p className="text-base text-gray-500 mb-10 max-w-2xl mx-auto animate-fade-in">
            Know if prices are rising or falling, how fast homes sell, whether renting beats buying, and what your property will be worth next year — powered by Zillow Research, BLS employment data, Census data, and 10+ real-time government sources.
          </p>
          <div className="flex gap-4 justify-center flex-wrap animate-fade-in">
            <Button 
              size="lg" 
              className="btn-gradient-purple"
              onClick={() => setLocation('/pricing')} 
              data-testid="button-get-started"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              className="btn-outline-cyan"
              onClick={() => setLocation('/demo')} 
              data-testid="button-see-demo"
            >
              See Demo
            </Button>
          </div>

          {/* Two Modes Section */}
          <div className="mt-12 mb-6">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-6">Two Modes. One Smarter Score.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-3xl mx-auto">
              {/* Homebuyer Mode Card */}
              <div className="flex-1 badge-glow rounded-xl p-5 text-left border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                    <Home className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Homebuyer Mode</h3>
                    <p className="text-cyan-400 text-xs">Prioritizes livability &amp; family factors</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                  Buying a home to live in? The score weights the factors that shape your daily life — great schools, safe streets, walkable neighborhoods, and a stable local market. Make your biggest purchase with total confidence.
                </p>
                <div className="space-y-1.5">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Score Weights</p>
                  {[
                    { label: 'Market Strength', pct: '25%', color: 'bg-cyan-500' },
                    { label: 'School Quality', pct: '20%', color: 'bg-cyan-400' },
                    { label: 'Demographic Trends', pct: '20%', color: 'bg-cyan-400' },
                    { label: 'Safety Score', pct: '15%', color: 'bg-cyan-300' },
                    { label: 'Walkability', pct: '10%', color: 'bg-cyan-300' },
                    { label: 'Rental Potential', pct: '10%', color: 'bg-cyan-200' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{label}</span>
                        <span className="text-gray-300 text-xs font-medium">{pct}</span>
                      </div>
                      <div className="w-16 h-1 rounded-full bg-gray-700/60 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investor Mode Card */}
              <div className="flex-1 badge-glow rounded-xl p-5 text-left border border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Investor Mode</h3>
                    <p className="text-purple-400 text-xs">Prioritizes cash flow &amp; appreciation</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                  Buying to rent or flip? The score re-weights toward rental yield, market appreciation, and economic growth — the numbers that drive your return on investment. Instantly see which properties pencil out.
                </p>
                <div className="space-y-1.5">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Score Weights</p>
                  {[
                    { label: 'Market Strength', pct: '30%', color: 'bg-purple-500' },
                    { label: 'Rental Potential', pct: '25%', color: 'bg-purple-400' },
                    { label: 'Demographic Trends', pct: '20%', color: 'bg-purple-400' },
                    { label: 'Safety Score', pct: '10%', color: 'bg-purple-300' },
                    { label: 'Walkability', pct: '10%', color: 'bg-purple-300' },
                    { label: 'School Quality', pct: '5%', color: 'bg-purple-200' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{label}</span>
                        <span className="text-gray-300 text-xs font-medium">{pct}</span>
                      </div>
                      <div className="w-16 h-1 rounded-full bg-gray-700/60 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex justify-center gap-6 mt-6 flex-wrap">
            <div className="badge-glow px-4 py-2 rounded-lg">
              <span className="text-cyan-400 font-bold">1-Year</span>
              <span className="text-gray-400 text-sm ml-2">Forecasts</span>
            </div>
            <div className="badge-glow px-4 py-2 rounded-lg">
              <span className="text-green-400 font-bold">10+</span>
              <span className="text-gray-400 text-sm ml-2">Data Sources</span>
            </div>
            <div className="badge-glow px-4 py-2 rounded-lg">
              <span className="text-purple-400 font-bold">Zillow</span>
              <span className="text-gray-400 text-sm ml-2">Powered</span>
            </div>
          </div>
        </div>
      </section>

      {/* Early Bird Special Section */}
      {earlyBirdStats && earlyBirdStats.spotsRemaining > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 glass border-y border-cyan-500/20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full mb-4 border border-purple-500/30">
              <Gift className="w-4 h-4" />
              <span className="text-sm font-semibold">Limited Time Offer</span>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white">
              Early Bird Special
            </h2>
            <p className="text-lg text-gray-400 mb-6">
              Sign up now and get <span className="font-bold text-cyan-400">2 FREE search credits</span> automatically added to your account!
            </p>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="text-5xl font-bold text-gradient-cyan metric-score">
                {earlyBirdStats.spotsRemaining}
              </div>
              <p className="text-sm text-gray-500">
                spots remaining out of 200
              </p>
              <div className="w-full max-w-md bg-gray-800/50 rounded-full h-3 overflow-hidden border border-gray-700">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-300"
                  style={{ width: `${((200 - earlyBirdStats.spotsRemaining) / 200) * 100}%` }}
                />
              </div>
            </div>
            <Button 
              size="lg" 
              className="btn-gradient-purple"
              onClick={() => window.location.href = '/api/login'} 
              data-testid="button-claim-early-bird"
            >
              Claim Your Free Credits
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Credits never expire • No credit card required
            </p>
          </div>
        </section>
      )}

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Buying Your First Property Shouldn't Feel Like Gambling
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Don't let unfamiliar neighborhoods and scattered data keep you from finding the perfect property
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <HelpCircle className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-lg text-white">New to the Area?</CardTitle>
                <CardDescription className="text-gray-400">
                  You don't have local knowledge about which neighborhoods are thriving and which ones to avoid. Understanding the macro-environment is crucial.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <AlertCircle className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-lg text-white">Overwhelmed by Data?</CardTitle>
                <CardDescription className="text-gray-400">
                  Census data, crime stats, school ratings, market trends—all scattered across dozens of websites. You need everything in one place.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <Target className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-lg text-white">Can't Trust Everything?</CardTitle>
                <CardDescription className="text-gray-400">
                  Realtors have incentives. Online reviews are mixed. You need objective, government-verified facts to make your decision.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <DollarSign className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-lg text-white">One Mistake = Big Loss</CardTitle>
                <CardDescription className="text-gray-400">
                  A beautiful house in the wrong neighborhood can cost you thousands. Location determines long-term value and rental potential.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Everything You Need to Know in One Simple Score
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            We analyze 10+ critical factors so you can make confident decisions about any US property
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <TrendingUp className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-white">Market Strength</CardTitle>
                <CardDescription className="text-gray-400">
                  Is this area growing or declining? Track property value trends, days on market, and homeownership rates to understand market momentum.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <Users className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-white">Demographics</CardTitle>
                <CardDescription className="text-gray-400">
                  Income levels, employment rates, education levels, and population growth patterns. Know who your neighbors will be.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <GraduationCap className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-white">School Quality</CardTitle>
                <CardDescription className="text-gray-400">
                  Understand school district ratings even if you don't have kids yet. Good schools drive property values and attract quality tenants.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <Home className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-white">Rental Potential</CardTitle>
                <CardDescription className="text-gray-400">
                  Need flexibility? See if you could rent this property later. Analyze rent-to-price ratios and rental demand indicators.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <Shield className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-white">Safety Score</CardTitle>
                <CardDescription className="text-gray-400">
                  Multi-source crime analysis combining ZIP-level crime grades, state FBI statistics, and national benchmarks (NIBRS) for comprehensive safety insights.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <Footprints className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-white">Walkability</CardTitle>
                <CardDescription className="text-gray-400">
                  Proximity to restaurants, shops, parks, healthcare, and transit. Quality of life matters for residents and renters alike.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 w-fit mb-3">
                  <DollarSign className="w-8 h-8 text-green-400 icon-glow" />
                </div>
                <CardTitle className="text-white">Affordability Analysis</CardTitle>
                <CardDescription className="text-gray-400">
                  Investment Grade rating (A–F), Market Timing signals, and Buy vs Rent analysis. Powered by Federal Reserve, HUD, and Bureau of Labor Statistics data.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 w-fit mb-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 icon-glow" />
                </div>
                <CardTitle className="text-white">Environmental Risk</CardTitle>
                <CardDescription className="text-gray-400">
                  Flood zone classification from FEMA, seismic hazard rating from USGS, and air quality index from EPA EJScreen. Know the risks before you buy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <BarChart3 className="w-8 h-8 text-cyan-400 icon-glow" />
                </div>
                <CardTitle className="text-white">Value &amp; Rent Forecasts</CardTitle>
                <CardDescription className="text-gray-400">
                  1-year home value appreciation forecast and rental rate projection sourced from Zillow Research data. See where the market is heading.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <Activity className="w-8 h-8 text-purple-400 icon-glow-purple" />
                </div>
                <CardTitle className="text-white">Economic Indicators</CardTitle>
                <CardDescription className="text-gray-400">
                  Local unemployment trends from BLS, new housing supply via building permits from Census data, and construction pipeline activity to gauge market health.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Mortgage Calculator Feature */}
          <div className="mt-12 text-center">
            <Card className="glass-card card-glow-hover border-cyan-500/30 max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center justify-center gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Calculator className="w-8 h-8 text-green-400 icon-glow" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-white text-xl">Mortgage Calculator Included</CardTitle>
                    <CardDescription className="text-gray-400">
                      Estimate your monthly payments with current market rates. See principal, interest, taxes, insurance, and PMI breakdowns—all in one place.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Investment Calculators Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-6 mx-auto block w-fit">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Investment Calculators</span>
          </div>
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Calculate Your Returns Like a Pro
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Four powerful calculators auto-populated with real data from your property analysis. No guesswork—just accurate numbers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 w-fit mb-3">
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle className="text-lg text-white">Cash Flow Calculator</CardTitle>
                <CardDescription className="text-gray-400">
                  See your monthly profit after all expenses. Includes vacancy reserves, maintenance, and the "1% Rule" check to quickly assess if a property will generate positive income.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 w-fit mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <CardTitle className="text-lg text-white">Cap Rate Calculator</CardTitle>
                <CardDescription className="text-gray-400">
                  Calculate Net Operating Income and Cap Rate to compare properties objectively. Understand Class A, B, and C property benchmarks and GRM (payback period).
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit mb-3">
                  <BarChart3 className="w-8 h-8 text-cyan-400" />
                </div>
                <CardTitle className="text-lg text-white">Cash-on-Cash Return</CardTitle>
                <CardDescription className="text-gray-400">
                  Measure your actual return on the cash you invest. Compare your real estate returns to savings accounts, stocks, or other investment opportunities.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 w-fit mb-3">
                  <Target className="w-8 h-8 text-yellow-400" />
                </div>
                <CardTitle className="text-lg text-white">Maximum Offer Price</CardTitle>
                <CardDescription className="text-gray-400">
                  Work backwards from your target return. Set your desired Cash-on-Cash return and instantly see the maximum price you should pay to hit that goal.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 glass-card px-6 py-4 rounded-lg border-cyan-500/30">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-300">
                <strong className="text-white">Auto-populated with real data:</strong> Property price, rent estimates, mortgage rates, and tax data are pulled from your analysis—just adjust and calculate.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Affordability & Value Analysis Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-6 mx-auto block w-fit">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">NEW: Affordability Analysis</span>
          </div>
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Know If It's the Right Time to Buy
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Get Investment Grade ratings (A-F), Market Timing signals, and comprehensive affordability metrics powered by real-time government data
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 w-fit mb-3">
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle className="text-lg text-white">Investment Grade</CardTitle>
                <CardDescription className="text-gray-400">
                  Get an A-F letter grade based on affordability, job market, and value metrics. Know at a glance if a property is worth your investment.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 w-fit mb-3">
                  <TrendingUp className="w-8 h-8 text-cyan-400" />
                </div>
                <CardTitle className="text-lg text-white">Market Timing Signal</CardTitle>
                <CardDescription className="text-gray-400">
                  Should you buy now, wait, or proceed with caution? Real-time signals based on mortgage trends, price levels, and economic indicators.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 w-fit mb-3">
                  <DollarSign className="w-8 h-8 text-purple-400" />
                </div>
                <CardTitle className="text-lg text-white">Buy vs Rent Analysis</CardTitle>
                <CardDescription className="text-gray-400">
                  Compare monthly mortgage costs to local rents. See break-even timelines and get clear buy, rent, or neutral recommendations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 w-fit mb-3">
                  <Target className="w-8 h-8 text-orange-400" />
                </div>
                <CardTitle className="text-lg text-white">Overvaluation Check</CardTitle>
                <CardDescription className="text-gray-400">
                  Is this property overpriced? We compare price-to-income ratios against historical averages to spot overheated markets.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Mortgage Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">Track 30-year fixed rates with week-over-week and year-over-year changes from Federal Reserve data.</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Job Market Strength</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">State unemployment rates, employment growth, and economic outlook from Bureau of Labor Statistics.</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Section 8 / HUD Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm">Fair Market Rent data by bedroom count. Know if Section 8 is viable for rental investors.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Powered by Official, Trusted Sources
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            All data comes from verified government and authoritative sources—no guesswork, no opinions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">US Census Bureau</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Official demographics, income, employment, education, and housing data from the 2022-2023 American Community Survey.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">OpenStreetMap</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Comprehensive walkability analysis with 50+ amenity categories within 1.5km radius including dining, shopping, healthcare, and transit.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">Zillow Data</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Live property listings, market statistics, 1-year home value forecasts, rent forecasts, days to pending, and sale-to-list ratios.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">Urban Institute Education Data</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Detailed school performance metrics, enrollment data, and charter/magnet school information covering 1,000+ schools.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">Crime Data by ZipCode</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Hyper-local crime grades (A-F) for your exact ZIP code, covering overall safety, violent crime, and property crime levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">FBI Crime Data API</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Official state-level crime statistics comparing violent and property crime rates against national averages.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">NIBRS National Benchmarks</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  National Incident-Based Reporting System data providing crime type breakdowns for context and comparison.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <CardTitle className="text-lg text-white">Federal Reserve (FRED)</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Real-time 30-year fixed mortgage rate trends with historical comparisons from the Federal Reserve Economic Data.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">HUD Fair Market Rent</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Official Section 8 rent limits by bedroom count from HUD, enabling rental investment strategy analysis.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">Bureau of Labor Statistics</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  State-level unemployment rates, labor force participation, and job market strength indicators.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">Census Building Permits</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  New construction activity data showing single-family and multi-family permit trends for supply outlook.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-6 h-6 text-green-400" />
                  <CardTitle className="text-lg text-white">RentCast API</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Property-specific rental estimates and rent comparables for accurate rental income projections.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Droplets className="w-6 h-6 text-blue-400" />
                  <CardTitle className="text-lg text-white">FEMA National Flood Hazard Layer</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Official FEMA flood zone classifications (Special Flood Hazard Areas, Zone X, and more) for every property address. Know if flood insurance is required or recommended before you close — and factor it into your true cost of ownership.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-6 h-6 text-amber-400" />
                  <CardTitle className="text-lg text-white">USGS National Seismic Hazard Maps</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Peak Ground Acceleration (PGA) data from the USGS ASCE 7-22 standard — the same seismic model used by structural engineers. Instantly know whether a property sits in a low, moderate, high, or very high seismic risk zone before purchasing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Wind className="w-6 h-6 text-green-400" />
                  <CardTitle className="text-lg text-white">EPA EJScreen 2023</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  EPA's Environmental Justice screening tool measuring air quality, PM2.5 particulates, ozone levels, and diesel pollution around any property. Environmental factors directly affect long-term livability, health outcomes, and property value trajectories.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 glass">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-lg text-gray-400 mb-12">
            Pay as you go • No monthly subscriptions • Credits never expire
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter Package */}
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Starter Package</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gradient-cyan metric-score">$10</span>
                  <span className="text-gray-400 text-lg"> one-time</span>
                </div>
                <CardDescription className="mt-4 text-gray-400">
                  Perfect for first-time buyers exploring a few properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="font-semibold text-white">5 property search credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Complete 10+ metric analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Investment Grade (A-F) rating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Market Timing signals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Buy vs Rent analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Real-time government data</span>
                  </li>
                </ul>
                <Button 
                  className="w-full btn-outline-cyan" 
                  onClick={() => setLocation('/pricing')} 
                  data-testid="button-starter-plan"
                >
                  Buy 5 Credits
                </Button>
              </CardContent>
            </Card>

            {/* Advanced Package */}
            <Card className="glass-card card-glow-hover border-cyan-500/50 relative glow-cyan-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">Best Value</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white">Advanced Package</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gradient-purple metric-score">$20</span>
                  <span className="text-gray-400 text-lg"> one-time</span>
                </div>
                <CardDescription className="mt-4 text-gray-400">
                  For investors comparing multiple properties or neighborhoods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="font-semibold text-white">12 property search credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Complete 10+ metric analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Investment Grade (A-F) rating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Market Timing signals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Buy vs Rent & Affordability</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Real-time government data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-300">Priority support</span>
                  </li>
                </ul>
                <Button 
                  className="w-full btn-gradient-purple" 
                  onClick={() => setLocation('/pricing')} 
                  data-testid="button-advanced-plan"
                >
                  Buy 12 Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Free Investor Toolkit Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
              100% Free
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Free <span className="text-gradient-cyan">Investor Toolkit</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Use our free calculators to plan your investment strategy. No sign-up required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-cyan-400 icon-glow" />
                  <CardTitle className="text-lg text-white">Buying Power</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  DTI Calculator and Home Affordability Calculator to understand your purchasing power and mortgage qualification.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Calculator className="w-6 h-6 text-purple-400 icon-glow-purple" />
                  <CardTitle className="text-lg text-white">Tax Planning</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Capital Gains Tax Calculator and 1031 Exchange Calculator to optimize your tax strategy when buying or selling.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-card card-glow-hover border-gray-700/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-green-400" />
                  <CardTitle className="text-lg text-white">Renovation</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Rehab Cost Estimator and ARV Calculator to evaluate fix-and-flip or BRRRR investment opportunities.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center">
            <Button 
              size="lg"
              className="btn-outline-cyan"
              onClick={() => setLocation('/toolkit')} 
              data-testid="button-explore-toolkit"
            >
              Explore Free Tools
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 hero-glow relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Make Your Next Property Decision with <span className="text-gradient-cyan">Confidence</span>
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join smart buyers who research the macro-environment before they commit
          </p>
          <Button 
            size="lg" 
            className="btn-gradient-purple px-10 py-6 text-lg"
            onClick={() => setLocation('/pricing')} 
            data-testid="button-cta-start"
          >
            Get Your First Report
          </Button>
        </div>
      </section>

      {/* Footer */}
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
              <span className="text-gray-700">•</span>
              <a href="/terms" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-gray-700">•</span>
              <a href="/contact" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-contact">
                Contact Us
              </a>
              <span className="text-gray-700">&bull;</span>
              <a href="/toolkit" className="text-sm text-gray-500 hover:text-cyan-400 transition-colors" data-testid="link-toolkit">
                Free Tools
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
