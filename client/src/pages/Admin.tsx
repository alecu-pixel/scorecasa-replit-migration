import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, CreditCard, TrendingUp, Plus, Minus, Database, RefreshCw, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { FaFacebook, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { format } from 'date-fns';
import type { User, Analysis } from '@shared/schema';
import Logo from '@/components/Logo';
import { useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

type AnalysisWithEmail = Analysis & { userEmail: string | null };

interface PipelineSource {
  dataSource: string;
  lastDownloadAt: string | null;
  lastSuccessAt: string | null;
  nextScheduledAt: string | null;
  recordCount: number;
  status: string;
  errorMessage: string | null;
}

interface PipelineStatus {
  sources: PipelineSource[];
  summary: {
    totalRecords: number;
    lastUpdated: string | null;
    healthyCount: number;
    errorCount: number;
    schedulerActive: boolean;
    schedulerStartedAt: string | null;
  };
}

// Refresh intervals in days for each source (used for data age color coding)
const SOURCE_INTERVALS: Record<string, number> = {
  fred_mortgage_rates: 7,
  bls_employment_data: 30,
  census_building_permits: 30,
  hud_fair_market_rent: 365,
  fbi_crime_stats: 365,
  zillow_home_value_forecast: 30,
  zillow_rent_forecast: 30,
  zillow_market_metrics: 30,
  fhfa_hpi_data: 90,
  redfin_market_data: 30,
  irs_migration_data: 365,
  opportunity_zones: 365,
};

function formatDataAge(lastSuccessAt: string | null): { label: string; color: string } {
  if (!lastSuccessAt) return { label: 'Never', color: 'text-red-400' };
  const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return { label: 'Today', color: 'text-emerald-400' };
  if (ageDays < 2) return { label: '1 day', color: 'text-emerald-400' };
  if (ageDays < 7) return { label: `${Math.floor(ageDays)} days`, color: 'text-emerald-400' };
  if (ageDays < 14) return { label: '1 week', color: 'text-amber-400' };
  if (ageDays < 30) return { label: `${Math.floor(ageDays / 7)} weeks`, color: 'text-amber-400' };
  if (ageDays < 60) return { label: '1 month', color: 'text-amber-400' };
  if (ageDays < 365) return { label: `${Math.floor(ageDays / 30)} months`, color: 'text-red-400' };
  return { label: `${Math.floor(ageDays / 365)}yr+`, color: 'text-red-400' };
}

function getDataAgeColor(dataSource: string, lastSuccessAt: string | null): string {
  if (!lastSuccessAt) return 'text-red-400';
  const intervalDays = SOURCE_INTERVALS[dataSource] || 30;
  const ageDays = (Date.now() - new Date(lastSuccessAt).getTime()) / (1000 * 60 * 60 * 24);
  const pct = ageDays / intervalDays;
  if (pct < 0.5) return 'text-emerald-400';
  if (pct < 1.0) return 'text-amber-400';
  return 'text-red-400';
}

function formatNextRefresh(nextScheduledAt: string | null): { label: string; color: string } {
  if (!nextScheduledAt) return { label: '—', color: 'text-muted-foreground' };
  const msUntil = new Date(nextScheduledAt).getTime() - Date.now();
  if (msUntil < 0) return { label: 'Overdue', color: 'text-red-400' };
  const daysUntil = msUntil / (1000 * 60 * 60 * 24);
  if (daysUntil < 1) return { label: 'Today', color: 'text-emerald-400' };
  if (daysUntil < 2) return { label: 'Tomorrow', color: 'text-emerald-400' };
  if (daysUntil < 7) return { label: `In ${Math.floor(daysUntil)} days`, color: 'text-emerald-400' };
  if (daysUntil < 14) return { label: `In 1 week`, color: 'text-muted-foreground' };
  return { label: format(new Date(nextScheduledAt), 'MMM d'), color: 'text-muted-foreground' };
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  'fred_mortgage_rates': 'FRED Mortgage Rates',
  'hud_fair_market_rent': 'HUD Fair Market Rent',
  'bls_employment_data': 'BLS Employment',
  'census_building_permits': 'Census Building Permits',
  'fbi_crime_stats': 'FBI Crime Data',
  'zillow_home_value_forecast': 'Zillow Home Value Forecast',
  'zillow_rent_forecast': 'Zillow Rent Forecast',
  'zillow_market_metrics': 'Zillow Market Metrics',
  'fhfa_hpi_data': 'FHFA House Price Index',
  'redfin_market_data': 'Market Competition (Zillow)',
  'irs_migration_data': 'IRS SOI Migration Data',
  'opportunity_zones': 'Opportunity Zones (IRS/Treasury)',
};

interface ZillowStatus {
  homeValueForecasts: number;
  rentForecasts: number;
  marketMetrics: number;
  lastUpdated: string | null;
}

interface RentCastQuotaStatus {
  quota: {
    monthYear: string;
    callsUsed: number;
    callsLimit: number;
    quotaRemaining: number;
    percentUsed: number;
  };
  cache: {
    totalCached: number;
    validCached: number;
    expiredCached: number;
  };
}

export default function Admin() {
  const { toast } = useToast();
  const { user: currentUser, isAdmin } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin,
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery<AnalysisWithEmail[]>({
    queryKey: ['/api/admin/analyses'],
    enabled: isAdmin,
  });

  const { data: pipelineStatus, isLoading: pipelineLoading, refetch: refetchPipeline } = useQuery<PipelineStatus>({
    queryKey: ['/api/admin/data-pipeline/status'],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: zillowStatus } = useQuery<ZillowStatus>({
    queryKey: ['/api/admin/data-pipeline/zillow-status'],
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const { data: rentcastStatus } = useQuery<RentCastQuotaStatus>({
    queryKey: ['/api/admin/data-pipeline/rentcast-quota'],
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  // Redirect non-admins
  if (!isAdmin && !usersLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="glass-card border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-gray-400">You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const creditMutation = useMutation({
    mutationFn: async ({ userId, credits, reason }: { userId: string; credits: number; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/credits`, { credits, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analyses'] });
      toast({
        title: 'Success',
        description: 'Credits updated successfully',
      });
      setDialogOpen(false);
      setCreditAmount('');
      setCreditReason('');
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update credits',
        variant: 'destructive',
      });
    },
  });

  const downloadAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/data-pipeline/download-all', {});
      return response.json();
    },
    onSuccess: (data) => {
      refetchPipeline();
      toast({
        title: 'Download Complete',
        description: 'All data sources have been refreshed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download data',
        variant: 'destructive',
      });
    },
  });

  const downloadSourceMutation = useMutation({
    mutationFn: async (source: string) => {
      const response = await apiRequest('POST', `/api/admin/data-pipeline/download/${source}`, {});
      return response.json();
    },
    onSuccess: () => {
      refetchPipeline();
      toast({
        title: 'Download Complete',
        description: 'Data source refreshed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download data',
        variant: 'destructive',
      });
    },
  });

  const handleCreditAdjustment = (add: boolean) => {
    if (!selectedUser || !creditAmount) return;
    
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }

    creditMutation.mutate({
      userId: selectedUser.id,
      credits: add ? amount : -amount,
      reason: creditReason || undefined,
    });
  };

  const totalUsers = users.length;
  const totalAnalyses = analyses.length;
  const totalCreditsInSystem = users.reduce((sum, user) => sum + (user.creditBalance || 0), 0);
  const recentAnalyses = analyses.slice(0, 10);

  return (
    <div className="min-h-screen hero-glow">
      <div className="container mx-auto p-6 space-y-6" data-testid="page-admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="heading-admin">Admin <span className="text-gradient-cyan">Dashboard</span></h1>
          <p className="text-gray-400">Manage users, credits, and monitor activity</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400" data-testid="stat-total-users">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Analyses</CardTitle>
            <Activity className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-total-analyses">{totalAnalyses}</div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-gray-300">Credits in System</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-total-credits">{totalCreditsInSystem}</div>
          </CardContent>
        </Card>

        <Card className="glass-card border-gray-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Credits/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-avg-credits">
              {totalUsers > 0 ? (totalCreditsInSystem / totalUsers).toFixed(1) : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
          <CardDescription className="text-gray-400">View and manage all users and their credit balances</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-gray-400">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell data-testid={`text-name-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`badge-credits-${user.id}`}>
                        {user.creditBalance} credits
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isAdmin === 1 && (
                        <Badge variant="default" data-testid={`badge-admin-${user.id}`}>Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedUser(null);
                          setCreditAmount('');
                          setCreditReason('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setDialogOpen(true);
                            }}
                            data-testid={`button-adjust-credits-${user.id}`}
                          >
                            Adjust Credits
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust Credits for {user.email}</DialogTitle>
                            <DialogDescription>
                              Current balance: {user.creditBalance} credits
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="credit-amount">Amount</Label>
                              <Input
                                id="credit-amount"
                                type="number"
                                min="1"
                                placeholder="Enter number of credits"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                data-testid="input-credit-amount"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="credit-reason">Reason (optional)</Label>
                              <Input
                                id="credit-reason"
                                placeholder="e.g., Manual adjustment, Support request"
                                value={creditReason}
                                onChange={(e) => setCreditReason(e.target.value)}
                                data-testid="input-credit-reason"
                              />
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleCreditAdjustment(false)}
                              disabled={creditMutation.isPending || !creditAmount}
                              data-testid="button-remove-credits"
                            >
                              <Minus className="w-4 h-4 mr-2" />
                              Remove Credits
                            </Button>
                            <Button
                              onClick={() => handleCreditAdjustment(true)}
                              disabled={creditMutation.isPending || !creditAmount}
                              data-testid="button-add-credits"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Credits
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Analysis Activity</CardTitle>
          <CardDescription className="text-gray-400">Last 10 property analyses across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="text-center py-8 text-gray-400">Loading analyses...</div>
          ) : recentAnalyses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No analyses yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>ZIP Code</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Credits Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAnalyses.map((analysis) => (
                  <TableRow key={analysis.id} data-testid={`row-analysis-${analysis.id}`}>
                    <TableCell className="text-sm text-muted-foreground">
                      {analysis.createdAt ? format(new Date(analysis.createdAt), 'MMM d, h:mm a') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm" data-testid={`text-user-${analysis.id}`}>
                      {analysis.userEmail || 'Unknown'}
                    </TableCell>
                    <TableCell data-testid={`text-address-${analysis.id}`}>{analysis.address}</TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-zip-${analysis.id}`}>
                        {analysis.zipCode || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {analysis.score !== null && (
                        <Badge variant="secondary" data-testid={`badge-score-${analysis.id}`}>
                          {analysis.score}/100
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{analysis.creditsUsed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Data Pipeline Management */}
      <Card className="glass-card border-gray-700/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Data Pipeline Management
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage cached government data sources for enriched property analysis
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadAllMutation.mutate()}
            disabled={downloadAllMutation.isPending}
            data-testid="button-download-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${downloadAllMutation.isPending ? 'animate-spin' : ''}`} />
            {downloadAllMutation.isPending ? 'Downloading...' : 'Refresh All'}
          </Button>
        </CardHeader>
        <CardContent>
          {pipelineLoading ? (
            <div className="text-center py-8 text-gray-400">Loading pipeline status...</div>
          ) : pipelineStatus ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm text-gray-400">Total Records</p>
                    <p className="text-xl font-bold text-white">{pipelineStatus.summary.totalRecords.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm text-gray-400">Healthy Sources</p>
                    <p className="text-xl font-bold text-white">{pipelineStatus.summary.healthyCount}/{pipelineStatus.sources.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-sm text-gray-400">Last Updated</p>
                    <p className="text-sm font-medium text-white">
                      {pipelineStatus.summary.lastUpdated
                        ? format(new Date(pipelineStatus.summary.lastUpdated), 'MMM d, h:mm a')
                        : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-400">Auto-Refresh</p>
                    {pipelineStatus.summary.schedulerActive ? (
                      <Badge variant="secondary" className="mt-1 bg-emerald-900/50 text-emerald-300" data-testid="badge-scheduler-active">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-1 bg-amber-900/50 text-amber-300" data-testid="badge-scheduler-inactive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Manual Only
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Data Age</TableHead>
                    <TableHead>Last Success</TableHead>
                    <TableHead>Next Refresh</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineStatus.sources.map((source) => {
                    const dataAge = formatDataAge(source.lastSuccessAt);
                    const ageColor = getDataAgeColor(source.dataSource, source.lastSuccessAt);
                    const nextRefresh = formatNextRefresh(source.nextScheduledAt);
                    return (
                      <TableRow key={source.dataSource} data-testid={`row-pipeline-${source.dataSource}`}>
                        <TableCell className="font-medium">
                          {DATA_SOURCE_LABELS[source.dataSource] || source.dataSource}
                        </TableCell>
                        <TableCell>
                          {source.status === 'success' || source.status === 'partial' ? (
                            <Badge variant="secondary" className="bg-emerald-900/50 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {source.status === 'partial' ? 'Partial' : 'Success'}
                            </Badge>
                          ) : source.status === 'downloading' ? (
                            <Badge variant="secondary" className="bg-cyan-900/50 text-cyan-300">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Downloading
                            </Badge>
                          ) : source.status === 'error' ? (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-records-${source.dataSource}`}>
                          {source.recordCount.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${ageColor}`} data-testid={`text-age-${source.dataSource}`}>
                          {dataAge.label}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {source.lastSuccessAt
                            ? format(new Date(source.lastSuccessAt), 'MMM d, h:mm a')
                            : 'Never'}
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${nextRefresh.color}`} data-testid={`text-next-refresh-${source.dataSource}`}>
                          {nextRefresh.label}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => downloadSourceMutation.mutate(source.dataSource)}
                            disabled={downloadSourceMutation.isPending}
                            data-testid={`button-refresh-${source.dataSource}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${downloadSourceMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pipelineStatus.sources.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        No data sources configured. Click "Refresh All" to initialize the data pipeline.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No pipeline data available. Click "Refresh All" to initialize.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zillow & RentCast Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Zillow Data Status */}
        <Card className="glass-card border-gray-700/50" data-testid="card-zillow-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Zillow Research Data
              </CardTitle>
              <CardDescription className="text-gray-400">Free CSV data for forecasts and market velocity</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadAllMutation.mutate()}
              disabled={downloadAllMutation.isPending}
              data-testid="button-refresh-zillow"
            >
              <RefreshCw className={`w-4 h-4 ${downloadAllMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {zillowStatus ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <p className="text-sm text-gray-400">Home Value Forecasts</p>
                  <p className="text-lg font-bold text-white">{zillowStatus.homeValueForecasts.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <p className="text-sm text-gray-400">Rent Forecasts</p>
                  <p className="text-lg font-bold text-white">{zillowStatus.rentForecasts.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <p className="text-sm text-gray-400">Market Metrics</p>
                  <p className="text-lg font-bold text-white">{zillowStatus.marketMetrics.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <p className="text-sm text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-cyan-400">
                    {zillowStatus.lastUpdated 
                      ? format(new Date(zillowStatus.lastUpdated), 'MMM d, h:mm a')
                      : 'Not yet downloaded'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p>No Zillow data available yet.</p>
                <p className="text-sm mt-2">Click refresh to download CSV data.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RentCast API Status */}
        <Card className="glass-card border-gray-700/50" data-testid="card-rentcast-status">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              RentCast API Quota
            </CardTitle>
            <CardDescription className="text-gray-400">Free tier: 50 calls/month with smart caching</CardDescription>
          </CardHeader>
          <CardContent>
            {rentcastStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                    <p className="text-sm text-gray-400">Used</p>
                    <p className="text-lg font-bold text-white">{rentcastStatus.quota.callsUsed}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                    <p className="text-sm text-gray-400">Remaining</p>
                    <p className="text-lg font-bold text-cyan-400">{rentcastStatus.quota.quotaRemaining}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                    <p className="text-sm text-gray-400">Limit</p>
                    <p className="text-lg font-bold text-white">{rentcastStatus.quota.callsLimit}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      rentcastStatus.quota.percentUsed > 80 ? 'bg-red-500' :
                      rentcastStatus.quota.percentUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${rentcastStatus.quota.percentUsed}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total Cached</p>
                    <p className="text-sm font-medium text-white">{rentcastStatus.cache.totalCached}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Valid Cache</p>
                    <p className="text-sm font-medium text-green-400">{rentcastStatus.cache.validCached}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Expired</p>
                    <p className="text-sm font-medium text-gray-400">{rentcastStatus.cache.expiredCached}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p>RentCast quota data not available.</p>
                <p className="text-sm mt-2">API key may not be configured.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
