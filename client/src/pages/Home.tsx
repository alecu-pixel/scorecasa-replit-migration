import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TrendingUp, Users, GraduationCap, Shield, MapPin, DollarSign } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { apiRequest } from '@/lib/queryClient';
import type { PropertyAnalysisResult } from '@shared/schema';
import Logo from '@/components/Logo';
import SearchInput from '@/components/SearchInput';
import ApiStatusIndicator from '@/components/ApiStatusIndicator';
import ScoreDisplay from '@/components/ScoreDisplay';
import MetricCard from '@/components/MetricCard';
import DemographicsDisplay from '@/components/DemographicsDisplay';
import WalkabilityDisplay from '@/components/WalkabilityDisplay';
import MarketDataDisplay from '@/components/MarketDataDisplay';
import MapView from '@/components/MapView';
import PropertyListings from '@/components/PropertyListings';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  const [result, setResult] = useState<PropertyAnalysisResult | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    census: ApiStatus;
    growth: ApiStatus;
    walkability: ApiStatus;
    propertyListings: ApiStatus;
  }>({
    census: 'idle',
    growth: 'idle',
    walkability: 'idle',
    propertyListings: 'idle',
  });
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (address: string) => {
      setApiStatus({
        census: 'loading',
        growth: 'loading',
        walkability: 'loading',
        propertyListings: 'loading',
      });

      const response = await apiRequest('POST', '/api/analyze', { address });
      const data: PropertyAnalysisResult = await response.json();

      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setApiStatus({
        census: data.apiStatus.census,
        growth: data.apiStatus.growth,
        walkability: data.apiStatus.walkability,
        propertyListings: data.apiStatus.propertyListings,
      });
      
      // Show warning if any API failed
      const failedApis = [];
      if (data.apiStatus.census === 'error') failedApis.push('Census');
      if (data.apiStatus.growth === 'error') failedApis.push('Growth Data');
      if (data.apiStatus.walkability === 'error') failedApis.push('Walkability');
      if (data.apiStatus.propertyListings === 'error') failedApis.push('Property Listings');
      
      if (failedApis.length > 0) {
        toast({
          title: 'Partial Data',
          description: `Some data unavailable: ${failedApis.join(', ')}. Results may be incomplete.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setApiStatus({
        census: 'error',
        growth: 'error',
        walkability: 'error',
        propertyListings: 'error',
      });
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze property. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAnalyze = (address: string) => {
    analyzeMutation.mutate(address);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-auto" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Section */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-3">
              Data-Driven Property Analysis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get comprehensive investment scores powered by real US Census data (2022-2023 ACS) and OpenStreetMap walkability metrics
            </p>
          </div>

          <SearchInput onAnalyze={handleAnalyze} loading={analyzeMutation.isPending} />

          {/* API Status */}
          {(apiStatus.census !== 'idle' || apiStatus.growth !== 'idle' || apiStatus.walkability !== 'idle' || apiStatus.propertyListings !== 'idle') && (
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              <ApiStatusIndicator status={apiStatus.census} label="Census API" />
              <ApiStatusIndicator status={apiStatus.growth} label="Growth Data" />
              <ApiStatusIndicator status={apiStatus.walkability} label="Walkability" />
              <ApiStatusIndicator status={apiStatus.propertyListings} label="Property Listings" />
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && !analyzeMutation.isPending && (
          <>
            {/* Address Header */}
            <section className="pb-8">
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-muted-foreground mt-1" />
                <div>
                  <h3 className="text-2xl font-semibold" data-testid="text-address">{result.address}</h3>
                  <p className="text-sm text-muted-foreground mt-1">ZIP Code: {result.zipCode}</p>
                </div>
              </div>
            </section>

            {/* Score Display */}
            <section className="pb-8">
              <ScoreDisplay score={result.score} scoreBreakdown={result.scoreBreakdown} />
            </section>

            {/* Data Availability Notice */}
            {(apiStatus.census === 'error' || apiStatus.growth === 'error' || apiStatus.walkability === 'error') && (
              <section className="pb-8">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Some data sources were unavailable. Scores marked with (*) use estimated values.
                  </AlertDescription>
                </Alert>
              </section>
            )}

            {/* Metrics Grid */}
            <section className="pb-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
                Key Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  icon={TrendingUp}
                  title="Market Strength"
                  score={result.scoreBreakdown[0].score}
                  description="Based on days on market and market statistics"
                  tooltip="Combines how quickly properties sell (days on market), homeownership rates, vacancy rates, property age, and high-value home concentration. Higher scores indicate a strong, stable market with low vacancy and quick sales."
                />
                <MetricCard
                  icon={Users}
                  title="Demographic Trends"
                  score={result.scoreBreakdown[1].score}
                  description="Based on Census 2022-2023 ACS data"
                  tooltip="Analyzes median household income, employment rates, education levels, and professional employment percentages. Higher scores indicate affluent, educated communities with strong job markets, which typically support better property values."
                />
                <MetricCard
                  icon={GraduationCap}
                  title="School Quality"
                  score={result.scoreBreakdown[2].score}
                  description="Based on Urban Institute Education Data"
                  tooltip="Evaluates schools within a 25-mile radius using Urban Institute data. The score reflects average school performance and availability of quality educational options. Good schools often correlate with family-friendly neighborhoods and strong property demand."
                />
                <MetricCard
                  icon={Shield}
                  title="Safety Score"
                  score={result.scoreBreakdown[3].score}
                  description={
                    result.crimeData 
                      ? `${result.crimeData.stateName}: Violent crime ${result.crimeData.violentCrimeVsNational > 0 ? '+' : ''}${result.crimeData.violentCrimeVsNational.toFixed(0)}% vs national avg`
                      : "Based on Census poverty and vacancy rates"
                  }
                  tooltip={
                    result.crimeData
                      ? `Based on FBI Crime Data API (${result.crimeData.year}). ${result.crimeData.stateName} violent crime rate: ${result.crimeData.violentCrimeRate.toFixed(1)} per 100K (national avg: ${result.crimeData.nationalViolentCrimeRate.toFixed(1)}). Property crime rate: ${result.crimeData.propertyCrimeRate.toFixed(1)} per 100K. Lower crime rates indicate safer neighborhoods.`
                      : "Uses Census poverty rates, vacancy rates, and property abandonment rates as proxy indicators for neighborhood safety. Lower poverty and vacancy typically correlate with safer neighborhoods. This is an estimate, not a guarantee of safety."
                  }
                />
                <MetricCard
                  icon={MapPin}
                  title="Walkability"
                  score={result.scoreBreakdown[4].score}
                  description="Based on OpenStreetMap data"
                  tooltip="Analyzes 50+ types of nearby amenities including restaurants, shops, parks, transit stops, healthcare facilities, and entertainment. Higher scores mean residents can easily walk to essential services, which enhances quality of life and property appeal."
                />
                <MetricCard
                  icon={DollarSign}
                  title="Rental Potential"
                  score={result.scoreBreakdown[5].score}
                  description="Based on Census rent and home value data"
                  tooltip="Calculates the rent-to-price ratio (annual rent divided by home value) and considers the balance of owner-occupied versus rental properties. The '1% rule' suggests monthly rent should be 1% of property value for good cash flow."
                />
              </div>
            </section>

            {/* Property Listings */}
            {result.propertyListings && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
                  Available Properties
                </h3>
                <PropertyListings data={result.propertyListings} />
              </section>
            )}

            {/* Detailed Data */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
                Detailed Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DemographicsDisplay data={result.demographics} />
                <WalkabilityDisplay data={result.walkability} />
                {result.marketData && <MarketDataDisplay data={result.marketData} />}
              </div>
            </section>

            {/* Map View */}
            {result.walkability.lat && result.walkability.lon && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
                  Property Location
                </h3>
                <MapView 
                  lat={result.walkability.lat} 
                  lon={result.walkability.lon} 
                  address={result.address}
                />
              </section>
            )}
          </>
        )}

        {/* Empty State */}
        {!result && !analyzeMutation.isPending && (
          <section className="py-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <TrendingUp className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground">
                Enter a property address with a ZIP code to get real Census and walkability data
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-6">
              <a href="https://www.facebook.com/profile.php?id=61584350274435" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover-elevate active-elevate-2 p-2 rounded-md" data-testid="link-facebook">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover-elevate active-elevate-2 p-2 rounded-md" data-testid="link-instagram">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/ScoreCasa" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover-elevate active-elevate-2 p-2 rounded-md" data-testid="link-x">
                <FaXTwitter className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@scorecasa" target="_blank" rel="noopener noreferrer" aria-label="Visit our TikTok page" className="text-muted-foreground hover-elevate active-elevate-2 p-2 rounded-md" data-testid="link-tiktok">
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
            <div className="flex items-center justify-center gap-4">
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
              <span className="text-muted-foreground">•</span>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
                Terms and Conditions
              </a>
              <span className="text-muted-foreground">•</span>
              <a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">
                Contact Us
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              ScoreCasa is a research tool, not financial, legal or real estate advice.
            </p>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 ScoreCasa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
