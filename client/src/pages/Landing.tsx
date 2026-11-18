import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Home, TrendingUp, Users, GraduationCap, Shield, Footprints, Droplets,
  Building2, Calculator, Briefcase, ArrowRight, Check, MapPin, Gift, Scale,
  FileText, Clock,
} from 'lucide-react';
import { FaFacebook, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Logo from '@/components/Logo';

const REPORT_ITEMS = [
  { icon: TrendingUp, title: 'Prices & where they’re heading', body: 'Recent price trends, how fast homes sell, and a 1-year value and rent outlook from Zillow Research.' },
  { icon: GraduationCap, title: 'Schools nearby', body: 'Ratings and details for the public schools that serve the address.' },
  { icon: Shield, title: 'Safety', body: 'ZIP-level crime grades compared with state and national rates, plus a local crime map.' },
  { icon: Droplets, title: 'Flood, earthquake & air', body: 'FEMA flood zone and past flood claims, USGS earthquake risk, and current air quality.' },
  { icon: Footprints, title: 'Everyday convenience', body: 'How many shops, parks, clinics and transit stops are within walking distance.' },
  { icon: Users, title: 'Who lives there', body: 'Income, age, education and population change from the U.S. Census.' },
  { icon: Scale, title: 'Buy or rent?', body: 'Your monthly cost to own versus local rents, and whether prices look stretched for the area.' },
  { icon: Briefcase, title: 'Local jobs', body: 'Unemployment trends and how many jobs are within reach of the home.' },
  { icon: Calculator, title: 'Your numbers', body: 'Mortgage, cash-flow and cap-rate calculators filled in with the property’s data.' },
];

const SOURCES = [
  ['U.S. Census Bureau', 'Demographics, income, building permits'],
  ['FEMA', 'Flood zones and flood insurance claims'],
  ['USGS', 'Earthquake hazard'],
  ['Federal Reserve (FRED)', 'Mortgage rate trends'],
  ['HUD', 'Fair market rents'],
  ['Bureau of Labor Statistics', 'Employment'],
  ['Zillow Research', 'Home value and rent forecasts'],
  ['FBI crime statistics', 'State and national crime rates'],
  ['SchoolDigger', 'School ratings'],
  ['OpenStreetMap', 'Nearby places and amenities'],
];

const HOMEBUYER_WEIGHTS = [
  ['Market strength', 25], ['Schools', 20], ['Neighborhood trends', 20],
  ['Safety', 15], ['Walkability', 10], ['Rental potential', 10],
] as const;

const INVESTOR_WEIGHTS = [
  ['Market strength', 30], ['Rental potential', 25], ['Neighborhood trends', 20],
  ['Safety', 10], ['Walkability', 10], ['Schools', 5],
] as const;

const SAMPLE_BARS = [
  ['Schools', 8.4], ['Safety', 7.1], ['Market strength', 7.9], ['Rental potential', 6.6], ['Walkability', 8.8],
] as const;

const FAQS = [
  {
    q: 'Where do the numbers come from?',
    a: 'From public and well-known sources: the U.S. Census Bureau, FEMA, USGS, the Federal Reserve, HUD, the Bureau of Labor Statistics, Zillow Research and others. Every section of the report says which source it uses, so you can check it yourself.',
  },
  {
    q: 'How is the 1–10 score worked out?',
    a: 'Each area (schools, safety, market, rent, walkability, neighborhood trends) gets its own score. We combine them with fixed weights you can see on this page. You can switch between the "living there" and "renting it out" weighting at any time, and the report explains what pushed the score up or down.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. ScoreCasa is a research tool that pulls the facts together in one place. It doesn’t replace a home inspection, an appraisal, or advice from a licensed agent, lender or advisor.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'Any residential address in the United States. Some sources (like school ratings or crime grades) can be thinner in very rural areas; the report tells you when data is limited.',
  },
  {
    q: 'Do I need a subscription?',
    a: 'No. You buy report credits once and use them whenever you like. Credits never expire. The calculators in the Free tools section need no account at all.',
  },
];

function Weights({ rows, tone }: { rows: readonly (readonly [string, number])[]; tone: 'sage' | 'brass' }) {
  const bar = tone === 'sage' ? 'bg-cyan-400' : 'bg-purple-400';
  return (
    <div className="space-y-2">
      {rows.map(([label, pct]) => (
        <div key={label} className="flex items-center gap-3 text-sm">
          <span className="w-36 sm:w-40 text-gray-300">{label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct * 3.3}%` }} />
          </div>
          <span className="w-10 text-right text-gray-400 tabular-nums">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();

  const { data: earlyBirdStats } = useQuery<{
    totalUsers: number;
    earlyBirdCount: number;
    spotsRemaining: number;
  }>({
    queryKey: ['/api/early-bird/stats'],
    refetchInterval: 60000,
  });

  const goSignup = () => setLocation('/login?mode=signup');

  return (
    <div className="min-h-screen text-gray-300">
      {/* Header */}
      <header className="sticky top-0 z-50 nav-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            <a href="/" aria-label="ScoreCasa home"><Logo className="h-9 w-auto" /></a>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" className="hidden md:inline-flex text-gray-300" onClick={() => setLocation('/demo')} data-testid="button-sample">
                Sample report
              </Button>
              <Button variant="ghost" className="hidden md:inline-flex text-gray-300" onClick={() => setLocation('/toolkit')} data-testid="button-toolkit">
                Free tools
              </Button>
              <Button variant="ghost" className="hidden sm:inline-flex text-gray-300" onClick={() => setLocation('/pricing')} data-testid="button-pricing">
                Pricing
              </Button>
              <Button variant="ghost" className="text-gray-300" onClick={() => setLocation('/login')} data-testid="button-login">
                Log in
              </Button>
              <Button className="btn-gradient-purple" onClick={goSignup} data-testid="button-signup">
                Get started
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="fade-in">
            <p className="inline-flex items-center gap-2 text-sm text-cyan-300 mb-6">
              <MapPin className="w-4 h-4" /> For home buyers and small investors across the U.S.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-50 leading-[1.08] mb-6">
              Know the neighborhood <span className="italic text-purple-300">before</span> you buy the house.
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed mb-8 max-w-xl">
              Type in any U.S. address. In about a minute you get one clear score from 1 to 10 and a
              readable report on schools, safety, flood risk, prices and rents — pulled from public
              records, not sales pitches.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Button size="lg" className="btn-gradient-purple h-12 px-6 text-base" onClick={goSignup} data-testid="button-get-started">
                Check an address <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="btn-outline-cyan h-12 px-6 text-base" onClick={() => setLocation('/demo')} data-testid="button-see-demo">
                See a sample report
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> No subscription</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Credits never expire</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Sources listed in every report</li>
            </ul>
          </div>

          {/* Sample score card (illustrative) */}
          <div className="relative fade-in" aria-label="Example ScoreCasa result">
            <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Example</p>
                  <p className="text-gray-100 font-medium">1600 Congress Ave</p>
                  <p className="text-sm text-gray-400">Austin, TX 78701</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-5xl font-semibold text-gray-50 leading-none">7.8</p>
                  <p className="text-xs text-gray-500 mt-1">out of 10</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {SAMPLE_BARS.map(([label, v]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{label}</span>
                      <span className="text-gray-400 tabular-nums">{v.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${v * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm">
                <p className="text-gray-200 font-medium mb-1 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-300" /> Flood zone X — minimal risk
                </p>
                <p className="text-gray-400">Flood insurance not required by lenders here.</p>
              </div>
            </div>
            <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2 rounded-xl bg-purple-400 text-gray-950 px-4 py-2.5 shadow-xl text-sm font-semibold">
              <Clock className="w-4 h-4" /> Ready in about a minute
            </div>
          </div>
        </div>
      </section>

      {/* Sources strip */}
      <section className="border-y border-white/10 bg-white/[0.02] px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
          <p className="text-xs uppercase tracking-widest text-gray-500 shrink-0">Built on data from</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            U.S. Census Bureau · FEMA · USGS · Federal Reserve · HUD · Bureau of Labor Statistics · Zillow Research · OpenStreetMap
          </p>
        </div>
      </section>

      {/* Early bird */}
      {earlyBirdStats && earlyBirdStats.spotsRemaining > 0 && (
        <section className="px-4 sm:px-6 py-14">
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="p-4 rounded-2xl bg-purple-400/10 border border-purple-400/30">
              <Gift className="w-8 h-8 text-purple-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-semibold text-gray-50 mb-2">Your first 2 reports are on us</h2>
              <p className="text-gray-400">
                Create a free account and we’ll add 2 report credits. No card needed.{' '}
                <span className="text-gray-300">{earlyBirdStats.spotsRemaining} of 200 spots left.</span>
              </p>
            </div>
            <Button size="lg" className="btn-gradient-purple shrink-0" onClick={goSignup} data-testid="button-claim-early-bird">
              Claim free reports
            </Button>
          </div>
        </section>
      )}

      {/* Problem — light band */}
      <section className="paper px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#1d2a24] mb-4">
              The house looks great. What about the street it’s on?
            </h2>
            <p className="text-lg text-[#55524a] leading-relaxed">
              Listings show you kitchens and square feet. The things that decide whether you’ll be happy
              there — and what the home is worth in five years — are spread across a dozen government
              websites. We bring them together.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ['New to the area?', 'Moving for a job or from abroad, you don’t know which parts of town are on the way up. The report gives you the local picture fast.'],
              ['Too many tabs open?', 'Crime maps, school sites, flood maps, census tables. One address in, one report out.'],
              ['Who can you trust?', 'Sellers and agents want the deal to close. Public records don’t. We show the source for every number.'],
              ['A costly mistake to undo', 'A great house on the wrong block can cost you for years — in resale value, insurance or rent.'],
            ].map(([t, b]) => (
              <div key={t} className="rounded-xl bg-white/70 border border-[#e3dccd] p-6">
                <h3 className="font-semibold text-[#1d2a24] mb-2">{t}</h3>
                <p className="text-sm text-[#5f5b52] leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's in a report */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-sm text-cyan-300 mb-3">What’s in a report</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-50 mb-4">
              Everything you’d research yourself, on one page
            </h2>
            <p className="text-lg text-gray-400">Each section has a short summary up top and the detail underneath, so you can skim or dig in.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REPORT_ITEMS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="glass-card card-glow-hover rounded-xl p-6">
                <Icon className="w-6 h-6 text-cyan-300 mb-4" />
                <h3 className="text-gray-100 font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button variant="outline" className="btn-outline-cyan" onClick={() => setLocation('/demo')}>
              <FileText className="w-4 h-4 mr-2" /> Open the sample report
            </Button>
          </div>
        </div>
      </section>

      {/* Two ways to score */}
      <section className="px-4 sm:px-6 py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-50 mb-4">One score, weighted for how you’ll use the home</h2>
            <p className="text-lg text-gray-400">
              Switch between the two views any time. Nothing is hidden: these are the exact weights behind the number.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-2">
                <Home className="w-5 h-5 text-cyan-300" />
                <h3 className="text-lg font-semibold text-gray-50">Living there</h3>
              </div>
              <p className="text-sm text-gray-400 mb-6">Leans on schools, safety and a steady local market.</p>
              <Weights rows={HOMEBUYER_WEIGHTS} tone="sage" />
            </div>
            <div className="glass-card rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-5 h-5 text-purple-300" />
                <h3 className="text-lg font-semibold text-gray-50">Renting it out</h3>
              </div>
              <p className="text-sm text-gray-400 mb-6">Leans on rent, price growth and local demand.</p>
              <Weights rows={INVESTOR_WEIGHTS} tone="brass" />
            </div>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="px-4 sm:px-6 py-20 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-50 mb-4">Where the numbers come from</h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              We don’t guess and we don’t sell listings. Every figure in your report comes from a named
              public or industry source, and the report tells you which one and how recent it is.
            </p>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {SOURCES.map(([name, what]) => (
              <div key={name} className="border-l-2 border-cyan-400/40 pl-4">
                <dt className="text-gray-100 font-medium">{name}</dt>
                <dd className="text-sm text-gray-400">{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-50 mb-4">Pay per report. That’s it.</h2>
            <p className="text-lg text-gray-400">No monthly fee. Credits never expire. One credit = one full property report.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { name: 'Starter', price: '$10', credits: '5 reports', each: '$2.00 per report', note: 'Comparing a few homes you’re serious about.', featured: false },
              { name: 'Plus', price: '$20', credits: '12 reports', each: '$1.67 per report', note: 'Weighing several neighborhoods or a small portfolio.', featured: true },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl p-7 ${p.featured ? 'bg-purple-400/[0.07] border border-purple-400/40' : 'glass-card'}`}>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-lg font-semibold text-gray-50">{p.name}</h3>
                  {p.featured && <span className="text-xs font-medium text-purple-300">Best value</span>}
                </div>
                <p className="font-serif text-4xl font-semibold text-gray-50 mb-1">{p.price}</p>
                <p className="text-gray-300">{p.credits} <span className="text-gray-500">· {p.each}</span></p>
                <p className="text-sm text-gray-400 mt-4 mb-6">{p.note}</p>
                <Button className={p.featured ? 'btn-gradient-purple w-full' : 'btn-outline-cyan w-full'} variant={p.featured ? 'default' : 'outline'} onClick={() => setLocation('/pricing')}>
                  Choose {p.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free tools */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto glass-card rounded-2xl p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-sm text-cyan-300 mb-2">Free, no account needed</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-50 mb-3">Seven calculators for buyers and investors</h2>
            <p className="text-gray-400">
              How much house can I afford? What’s my debt-to-income? Capital gains, 1031 exchange,
              rehab costs, after-repair value and a stress test for rising rates.
            </p>
          </div>
          <Button size="lg" variant="outline" className="btn-outline-cyan" onClick={() => setLocation('/toolkit')}>
            Open free tools <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="paper px-4 sm:px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#1d2a24] mb-8">Common questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className="border-[#ddd5c4]">
                <AccordionTrigger className="text-left text-[#1d2a24] text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[#55524a] text-base leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-semibold text-gray-50 mb-5 leading-tight">
            Make an offer knowing what you’re buying into.
          </h2>
          <p className="text-lg text-gray-400 mb-8">Start with two free reports. Try it on the home you’re looking at this week.</p>
          <Button size="lg" className="btn-gradient-purple h-12 px-7 text-base" onClick={goSignup} data-testid="button-final-cta">
            Check an address <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div>
            <Logo className="h-8 w-auto mb-2" />
            <p className="text-xs text-gray-500 max-w-sm">
              ScoreCasa is a research tool, not financial, legal or real estate advice.
              &copy; {new Date().getFullYear()} ScoreCasa
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <a href="/demo" className="text-gray-400 hover:text-gray-100">Sample report</a>
            <a href="/toolkit" className="text-gray-400 hover:text-gray-100" data-testid="link-toolkit">Free tools</a>
            <a href="/pricing" className="text-gray-400 hover:text-gray-100">Pricing</a>
            <a href="/contact" className="text-gray-400 hover:text-gray-100" data-testid="link-contact">Contact</a>
            <a href="/privacy" className="text-gray-400 hover:text-gray-100" data-testid="link-privacy">Privacy</a>
            <a href="/terms" className="text-gray-400 hover:text-gray-100" data-testid="link-terms">Terms</a>
            <span className="flex items-center gap-1">
              <a href="https://www.facebook.com/profile.php?id=61584350274435" target="_blank" rel="noopener noreferrer" aria-label="ScoreCasa on Facebook" className="text-gray-500 hover:text-gray-100 p-2" data-testid="link-facebook"><FaFacebook className="w-4 h-4" /></a>
              <a href="https://x.com/ScoreCasa" target="_blank" rel="noopener noreferrer" aria-label="ScoreCasa on X" className="text-gray-500 hover:text-gray-100 p-2" data-testid="link-x"><FaXTwitter className="w-4 h-4" /></a>
              <a href="https://www.tiktok.com/@scorecasa" target="_blank" rel="noopener noreferrer" aria-label="ScoreCasa on TikTok" className="text-gray-500 hover:text-gray-100 p-2" data-testid="link-tiktok"><FaTiktok className="w-4 h-4" /></a>
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
