import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, GraduationCap, Shield, MapPin, DollarSign, LogOut, Sparkles, History, Clock, ChevronDown, ChevronUp, RefreshCw, Eye, GitCompareArrows, Check, X, Star } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter, FaTiktok } from 'react-icons/fa6';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { PropertyAnalysisResult, User } from '@shared/schema';
import Logo from '@/components/Logo';
import SearchInput from '@/components/SearchInput';
import ApiStatusIndicator from '@/components/ApiStatusIndicator';
import ScoreDisplay from '@/components/ScoreDisplay';
import InvestmentAnalysisDisplay from '@/components/InvestmentAnalysisDisplay';
import MetricCard from '@/components/MetricCard';
import DemographicsDisplay from '@/components/DemographicsDisplay';
import WalkabilityDisplay from '@/components/WalkabilityDisplay';
import MarketDataDisplay from '@/components/MarketDataDisplay';
import SchoolsDisplay from '@/components/SchoolsDisplay';
import MapView from '@/components/MapView';
import PropertyListings from '@/components/PropertyListings';
import PdfExportButton from '@/components/PdfExportButton';
import MortgageCalculator from '@/components/MortgageCalculator';
import InvestmentCalculators from '@/components/InvestmentCalculators';
import ComparableSales from '@/components/ComparableSales';
import EnhancedSafetyScore from '@/components/EnhancedSafetyScore';
import FloodRisk from '@/components/FloodRisk';
import EnvironmentalRisk from '@/components/EnvironmentalRisk';
import SeismicRisk from '@/components/SeismicRisk';
import JobsProximity from '@/components/JobsProximity';
import AppreciationOutlook from '@/components/AppreciationOutlook';
import AffordabilityMetrics from '@/components/AffordabilityMetrics';
import { DataDisclaimer } from '@/components/DataConfidence';
import PropertyComparison from '@/components/PropertyComparison';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isUnauthorizedError } from '@/lib/authUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';

type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !authLoading) {
      const hasSeenEarlyBirdWelcome = localStorage.getItem(`earlybird_welcome_${user.id}`);
      
      if (!hasSeenEarlyBirdWelcome && user.creditBalance > 0) {
        toast({
          title: "Welcome to ScoreCasa!",
          description: `You have ${user.creditBalance} search credit${user.creditBalance > 1 ? 's' : ''} ready to use. Start analyzing properties now!`,
        });
        
        localStorage.setItem(`earlybird_welcome_${user.id}`, 'true');
      }
    }
  }, [user, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access the dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const [result, setResult] = useState<PropertyAnalysisResult | null>(null);
  const [scoringMode, setScoringMode] = useState<'homebuyer' | 'investor'>('homebuyer');
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [compareProperties, setCompareProperties] = useState<PropertyAnalysisResult[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  
  // Search history type
  interface SearchHistoryItem {
    id: string;
    address: string;
    zipCode: string | null;
    score: number | null;
    fromCache: boolean;
    createdAt: string | null;
    hasFullResult: boolean;
  }
  
  // Fetch search history
  const { data: searchHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<SearchHistoryItem[]>({
    queryKey: ['/api/search-history'],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  
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
    onSuccess: async (data) => {
      setResult(data);
      setApiStatus({
        census: data.apiStatus.census,
        growth: data.apiStatus.growth,
        walkability: data.apiStatus.walkability,
        propertyListings: data.apiStatus.propertyListings,
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/auth/user'],
        refetchType: 'active'
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/search-history'],
        refetchType: 'active'
      });
      
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
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message?.includes('Insufficient credits') || error.message?.includes('credits')) {
        toast({
          title: 'Insufficient Credits',
          description: 'You need more credits to analyze properties. Purchase credits to continue.',
          variant: 'destructive',
        });
        setTimeout(() => setLocation('/pricing'), 2000);
        return;
      }
      
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
  
  // Load analysis from history
  const handleLoadFromHistory = async (historyItem: SearchHistoryItem) => {
    if (!historyItem.hasFullResult) {
      toast({
        title: 'Not Available',
        description: 'Full analysis data is not available for this older search.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoadingHistoryId(historyItem.id);
    try {
      const response = await fetch(`/api/search-history/${historyItem.id}`);
      if (!response.ok) {
        throw new Error('Failed to load analysis');
      }
      const data = await response.json();
      setResult(data.result);
      setApiStatus({
        census: data.result.apiStatus?.census || 'success',
        growth: data.result.apiStatus?.growth || 'success',
        walkability: data.result.apiStatus?.walkability || 'success',
        propertyListings: data.result.apiStatus?.propertyListings || 'success',
      });
      toast({
        title: 'Analysis Loaded',
        description: `Loaded previous analysis for ${historyItem.address}`,
      });
      setShowHistory(false);
    } catch (error: any) {
      toast({
        title: 'Failed to Load',
        description: error.message || 'Could not load the previous analysis.',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          toast({ title: 'Maximum 3 properties', description: 'You can compare up to 3 properties at a time.', variant: 'destructive' });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleStartCompare = async () => {
    if (selectedForCompare.size < 2) {
      toast({ title: 'Select at least 2', description: 'Please select at least 2 properties to compare.', variant: 'destructive' });
      return;
    }
    setLoadingCompare(true);
    try {
      const ids = Array.from(selectedForCompare);
      const results: PropertyAnalysisResult[] = [];
      for (const id of ids) {
        const response = await fetch(`/api/search-history/${id}`);
        if (!response.ok) throw new Error(`Failed to load analysis ${id}`);
        const data = await response.json();
        results.push(data.result);
      }
      setCompareProperties(results);
      setShowComparison(true);
    } catch (error: any) {
      toast({ title: 'Compare Failed', description: error.message || 'Could not load the selected analyses.', variant: 'destructive' });
    } finally {
      setLoadingCompare(false);
    }
  };

  const exitComparison = () => {
    setShowComparison(false);
    setCompareProperties([]);
    setCompareMode(false);
    setSelectedForCompare(new Set());
  };

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
              {user && (
                <>
                  <div className="text-sm">
                    <Badge className="badge-glow text-cyan-400 border-cyan-500/50 bg-cyan-500/10" data-testid="badge-credits">
                      {user.creditBalance || 0} Credits
                    </Badge>
                  </div>
                  <Button 
                    className="btn-outline-cyan" 
                    size="sm" 
                    onClick={() => setLocation('/pricing')} 
                    data-testid="button-buy-credits"
                  >
                    Buy Credits
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-cyan-400 hover:bg-white/5"
                      onClick={() => setLocation('/admin')} 
                      data-testid="button-admin"
                    >
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-red-400 hover:bg-white/5"
                    onClick={() => window.location.href = '/api/logout'} 
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Comparison View */}
        {showComparison && compareProperties.length >= 2 && (
          <section className="py-12">
            <PropertyComparison properties={compareProperties} onBack={exitComparison} />
          </section>
        )}

        {/* Search Section */}
        {!showComparison && (<>
        <section className="py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 badge-glow px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">AI-Powered Analysis</span>
            </div>
            <h2 className="text-4xl font-bold mb-3 text-white">
              Data-Driven Property <span className="text-gradient-cyan">Analysis</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
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
          
          {/* Search History Toggle */}
          {isAuthenticated && searchHistory && searchHistory.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 mx-auto text-gray-400 hover:text-cyan-400 transition-colors"
                data-testid="button-toggle-history"
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {showHistory ? 'Hide' : 'Show'} Search History ({searchHistory.length})
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showHistory && (
                <Card className="mt-4 glass-card border-gray-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                      <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Your Previous Searches
                      </h4>
                      <div className="flex items-center gap-2">
                        {searchHistory.filter(i => i.hasFullResult).length >= 2 && (
                          <Button
                            variant={compareMode ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setCompareMode(!compareMode);
                              if (compareMode) setSelectedForCompare(new Set());
                            }}
                            className={compareMode ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "text-gray-400"}
                            data-testid="button-toggle-compare"
                          >
                            <GitCompareArrows className="w-4 h-4 mr-1" />
                            {compareMode ? 'Cancel' : 'Compare'}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => refetchHistory()}
                          className="text-gray-400"
                          data-testid="button-refresh-history"
                        >
                          <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {compareMode && (
                      <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-wrap">
                        <span className="text-xs text-cyan-300">
                          Select 2-3 properties to compare ({selectedForCompare.size} selected)
                        </span>
                        {selectedForCompare.size >= 2 && (
                          <Button
                            size="sm"
                            onClick={handleStartCompare}
                            disabled={loadingCompare}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white"
                            data-testid="button-start-compare"
                          >
                            {loadingCompare ? (
                              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <GitCompareArrows className="w-4 h-4 mr-1" />
                            )}
                            Compare {selectedForCompare.size} Properties
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchHistory.map((item) => {
                        const isSelected = selectedForCompare.has(item.id);
                        return (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between gap-2 p-3 rounded-lg transition-colors group ${
                            compareMode && isSelected 
                              ? 'bg-cyan-500/15 border border-cyan-500/30' 
                              : 'bg-gray-800/50 hover:bg-gray-700/50'
                          }`}
                          data-testid={`history-item-${item.id}`}
                        >
                          {compareMode && (
                            <button
                              onClick={() => item.hasFullResult && toggleCompareSelection(item.id)}
                              disabled={!item.hasFullResult}
                              className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? 'bg-cyan-500 border-cyan-400' 
                                  : item.hasFullResult 
                                    ? 'border-gray-600 hover:border-cyan-500' 
                                    : 'border-gray-700 opacity-40'
                              }`}
                              data-testid={`checkbox-compare-${item.id}`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={item.address}>
                              {item.address}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-400">
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Unknown date'}
                              </span>
                              {item.score !== null && (
                                <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                                  Score: {item.score}
                                </Badge>
                              )}
                              {item.fromCache && (
                                <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                                  Cached
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {!compareMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadFromHistory(item)}
                              disabled={!item.hasFullResult || loadingHistoryId === item.id}
                              className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-view-${item.id}`}
                            >
                              {loadingHistoryId === item.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                      })}
                    </div>
                    
                    {searchHistory.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No search history yet. Analyze a property to get started!
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && !analyzeMutation.isPending && (
          <>
            {/* PDF Export Target - wraps report content */}
            <div id="property-report">
            {/* Address Header */}
            <section className="pb-8">
              <div className="flex items-start gap-3 glass-card p-6 rounded-lg border-gray-700/50">
                <MapPin className="w-6 h-6 text-cyan-400 icon-glow mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-semibold text-white" data-testid="text-address">{result.address}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-sm text-gray-400">ZIP Code: {result.zipCode}</p>
                    {result.opportunityZone?.isOpportunityZone && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/35"
                        data-testid="badge-opportunity-zone"
                        title={result.opportunityZone.insight}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Opportunity Zone</span>
                        {result.opportunityZone.designation && (
                          <span className="text-xs text-amber-500/70">{result.opportunityZone.designation}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {result.opportunityZone?.isOpportunityZone && (
                    <p className="text-xs text-amber-400/70 mt-1.5 leading-relaxed max-w-2xl">
                      {result.opportunityZone.insight}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Score Display */}
            <section className="pb-8">
              <ScoreDisplay
                score={result.score}
                scoreBreakdown={result.scoreBreakdown}
                onModeChange={setScoringMode}
              />
            </section>

            {/* Appreciation / Purchase Outlook */}
            <section className="pb-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                {scoringMode === 'homebuyer' ? 'Home Purchase Outlook' : 'Appreciation Outlook'}
              </h3>
              <AppreciationOutlook
                forecastData={result.forecastData}
                affordabilityData={result.affordabilityData}
                demographics={result.demographics}
                medianHomeValue={result.demographics?.medianHomeValue || result.marketData?.medianHomeValue || undefined}
                mode={scoringMode}
              />
            </section>

            {/* Investment / Home Purchase Analysis */}
            <section className="pb-8">
              <InvestmentAnalysisDisplay
                analysis={result.investmentAnalysis}
                mode={scoringMode}
                scoreBreakdown={result.scoreBreakdown}
                demographics={result.demographics ?? undefined}
                schools={result.schools ?? undefined}
                walkability={result.walkability ?? undefined}
              />
            </section>

            {/* Data Availability Notice */}
            {(apiStatus.census === 'error' || apiStatus.growth === 'error' || apiStatus.walkability === 'error') && (
              <section className="pb-8">
                <Alert className="glass border-red-500/30 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">
                    Some data sources were unavailable. Scores marked with (*) use estimated values.
                  </AlertDescription>
                </Alert>
              </section>
            )}

            {/* Metrics Grid */}
            <section className="pb-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Key Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  icon={TrendingUp}
                  title="Market Strength"
                  score={result.scoreBreakdown[0].score}
                  description="Based on days on market and market statistics"
                  tooltip="Combines how quickly properties sell (days on market), homeownership rates, vacancy rates, property age, and high-value home concentration. Higher scores indicate a strong, stable market with low vacancy and quick sales."
                  reasoning={result.scoreBreakdown[0].reasoning}
                />
                <MetricCard
                  icon={Users}
                  title="Demographic Trends"
                  score={result.scoreBreakdown[1].score}
                  description="Based on Census 2022-2023 ACS data"
                  tooltip="Analyzes median household income, employment rates, education levels, and professional employment percentages. Higher scores indicate affluent, educated communities with strong job markets, which typically support better property values."
                  reasoning={result.scoreBreakdown[1].reasoning}
                />
                <MetricCard
                  icon={GraduationCap}
                  title="School Quality"
                  score={result.scoreBreakdown[2].score}
                  description={result.schools?.data_source === 'schooldigger' 
                    ? `Based on SchoolDigger rankings${result.schools?.average_star_rating ? ` (${result.schools.average_star_rating.toFixed(1)}★ avg)` : ''}`
                    : "Based on Urban Institute Education Data"}
                  tooltip={result.schools?.data_source === 'schooldigger'
                    ? "Evaluates schools using SchoolDigger's official star ratings and state percentile rankings. Schools are rated 1-5 stars based on test scores and other quality metrics. Higher percentiles mean the school performs better than that percentage of schools statewide."
                    : "Evaluates schools within a 25-mile radius using Urban Institute data. The score reflects average school performance and availability of quality educational options. Good schools often correlate with family-friendly neighborhoods and strong property demand."}
                  reasoning={result.scoreBreakdown[2].reasoning}
                />
                <MetricCard
                  icon={Shield}
                  title="Safety Score"
                  score={result.scoreBreakdown[3].score}
                  description={
                    result.enrichedCrimeData 
                      ? result.enrichedCrimeData.summary.headline
                      : result.crimeData 
                        ? `${result.crimeData.stateName}: ${result.crimeData.safetyScore >= 70 ? 'Very Safe' : result.crimeData.safetyScore >= 55 ? 'Safe' : 'Average'}`
                        : "Based on Census proxy data"
                  }
                  tooltip={
                    result.enrichedCrimeData
                      ? `Composite safety score from ZIP-level crime grades, state FBI statistics, and national benchmarks. Click to see detailed breakdown below.`
                      : result.crimeData
                        ? `Based on FBI Crime Data (${result.crimeData.year}). ${result.crimeData.stateName} violent crime: ${result.crimeData.violentCrimeRate.toFixed(0)}/100K. Score combines violent (60%) and property (40%) crime rates.`
                        : "Uses Census poverty rates and vacancy rates as proxy indicators for neighborhood safety."
                  }
                  reasoning={result.scoreBreakdown[3].reasoning}
                />
                <MetricCard
                  icon={MapPin}
                  title="Walkability"
                  score={result.scoreBreakdown[4].score}
                  description="Based on OpenStreetMap data"
                  tooltip="Analyzes 50+ types of nearby amenities including restaurants, shops, parks, transit stops, healthcare facilities, and entertainment. Higher scores mean residents can easily walk to essential services, which enhances quality of life and property appeal."
                  reasoning={result.scoreBreakdown[4].reasoning}
                />
                <MetricCard
                  icon={DollarSign}
                  title="Rental Potential"
                  score={result.scoreBreakdown[5].score}
                  description="Based on Census rent and home value data"
                  tooltip="Calculates the rent-to-price ratio (annual rent divided by home value) and considers the balance of owner-occupied versus rental properties. The '1% rule' suggests monthly rent should be 1% of property value for good cash flow."
                  reasoning={result.scoreBreakdown[5].reasoning}
                />
              </div>
            </section>

            {/* Affordability & Value Analysis */}
            {result.affordabilityData && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                  Affordability & Value Analysis
                </h3>
                <AffordabilityMetrics data={result.affordabilityData} />
              </section>
            )}

            {/* Property Listings */}
            {result.propertyListings && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                  Available Properties
                </h3>
                <PropertyListings data={result.propertyListings} />
              </section>
            )}

            {/* Comparable Sales */}
            {result.propertyListings && result.propertyListings.listings.length > 0 && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                  Comparable Sales Analysis
                </h3>
                <ComparableSales 
                  listings={result.propertyListings.listings}
                  totalCount={result.propertyListings.total_count}
                  medianPrice={result.propertyListings.median_price}
                  avgPrice={result.propertyListings.avg_price}
                  avgDaysOnMarket={result.propertyListings.avg_days_on_market}
                  subjectPropertyPrice={result.estimatedPropertyPrice?.price || 0}
                />
              </section>
            )}

            {/* Mortgage Calculator */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Mortgage Calculator
              </h3>
              <MortgageCalculator 
                initialHomePrice={result.estimatedPropertyPrice?.price || 350000}
                priceSource={result.estimatedPropertyPrice?.sourceDescription}
              />
            </section>

            {/* Investment Calculators */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Investment Calculators
              </h3>
              <InvestmentCalculators analysisResult={result} />
            </section>

            {/* Detailed Data */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Detailed Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DemographicsDisplay data={result.demographics} />
                <WalkabilityDisplay data={result.walkability} />
                {result.marketData && <MarketDataDisplay data={result.marketData} />}
                {result.schools && result.schools.schools.length > 0 && (
                  <SchoolsDisplay data={result.schools} />
                )}
              </div>
            </section>

            {/* Enhanced Safety Analysis */}
            {(result.enrichedCrimeData || result.crimeData) && (
              <section className="pb-12">
                <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                  Safety & Crime Analysis
                </h3>
                <EnhancedSafetyScore 
                  enrichedData={result.enrichedCrimeData} 
                  legacyData={result.crimeData} 
                />
              </section>
            )}

            {/* Flood Risk Assessment */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Flood Risk Assessment
              </h3>
              <FloodRisk data={result.floodRisk} />
            </section>

            {/* Environmental & Seismic Risk */}
            <section className="pb-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Environmental &amp; Seismic Risk
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <EnvironmentalRisk data={result.environmentalRisk} />
                <SeismicRisk data={result.seismicRisk} />
              </div>
            </section>

            {/* Jobs Proximity */}
            <section className="pb-8">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Employment &amp; Jobs Proximity
              </h3>
              <JobsProximity data={result.jobsProximity} />
            </section>

            {/* Map View */}
            <section className="pb-12">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400 mb-4">
                Property Location
              </h3>
              {(() => {
                const mapLat = result.resolvedCoordinates?.lat ?? result.walkability.lat;
                const mapLon = result.resolvedCoordinates?.lon ?? result.walkability.lon;
                return mapLat != null && mapLon != null;
              })() ? (
                <MapView 
                  lat={(result.resolvedCoordinates?.lat ?? result.walkability.lat)!} 
                  lon={(result.resolvedCoordinates?.lon ?? result.walkability.lon)!} 
                  address={result.address}
                  showFloodZones={true}
                />
              ) : (
                <Card className="glass-card border-gray-700/50">
                  <CardContent className="p-8 text-center" data-testid="map-unavailable-fallback">
                    <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <h4 className="text-sm font-medium mb-2 text-white">Map Unavailable</h4>
                    <p className="text-sm text-gray-400">
                      We couldn't determine the exact coordinates for this address. The walkability score and amenities data are still accurate and based on the ZIP code area.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
            </div>

            {/* Data Transparency */}
            <section className="pb-8">
              <DataDisclaimer variant="section" />
            </section>

            {/* Export PDF Button */}
            <section className="pb-12 flex justify-center">
              <PdfExportButton 
                targetId="property-report" 
                address={result.address}
              />
            </section>
          </>
        )}

        {/* Empty State */}
        {!result && !analyzeMutation.isPending && (
          <section className="py-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 inline-block mb-6 pulse-glow">
                <TrendingUp className="w-12 h-12 text-cyan-400 icon-glow" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Ready to Analyze</h3>
              <p className="text-gray-400">
                Enter a property address with a ZIP code to get real Census and walkability data
              </p>
            </div>
          </section>
        )}
        </>)}
      </main>

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
