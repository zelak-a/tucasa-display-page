import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Building2, MapPin, ArrowLeft } from 'lucide-react';
import { ExportMenu } from '@/components/ExportMenu';
import { useAuth } from '@/contexts/AuthContext';

const CHART_COLORS = [
  'hsl(142, 60%, 35%)',
  'hsl(38, 90%, 55%)',
  'hsl(210, 80%, 50%)',
  'hsl(340, 65%, 50%)',
  'hsl(270, 60%, 50%)',
  'hsl(180, 50%, 40%)',
  'hsl(20, 80%, 50%)',
  'hsl(100, 50%, 40%)',
];

interface BranchStat {
  name: string;
  members: number;
  active: number;
}

interface ZoneStat {
  name: string;
  members: number;
  branches: number;
}

interface ConferenceStat {
  name: string;
  members: number;
  zones: number;
}

export default function Reports() {
  const navigate = useNavigate();
  const { highestLevel, userRoles, user } = useAuth();
  const [branchStats, setBranchStats] = useState<BranchStat[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [conferenceStats, setConferenceStats] = useState<ConferenceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [membersRes, branchesRes, zonesRes, confsRes] = await Promise.all([
        supabase.from('members').select('id, is_active, branch_id, user_id'),
        supabase.from('branches').select('id, name, zone_id'),
        supabase.from('zones').select('id, name, conference_id'),
        supabase.from('conferences').select('id, name'),
      ]);

      const members = membersRes.data || [];
      const branches = branchesRes.data || [];
      const zones = zonesRes.data || [];
      const conferences = confsRes.data || [];

      // Compute scope
      const isUnion = userRoles.some(r => r.hierarchy_level === 'union');
      const isPlainMember = userRoles.length === 0;
      let conferenceIds = new Set<string>();
      let zoneIds = new Set<string>();
      let branchIds = new Set<string>();

      if (isUnion) {
        conferenceIds = new Set(conferences.map(c => c.id));
        zoneIds = new Set(zones.map(z => z.id));
        branchIds = new Set(branches.map(b => b.id));
      } else if (isPlainMember) {
        // Only own branch
        const myMember = members.find(m => (m as any).user_id === user?.id);
        if (myMember) branchIds.add(myMember.branch_id);
      } else {
        userRoles.forEach(r => {
          if (r.hierarchy_level === 'conference') conferenceIds.add(r.level_id);
          else if (r.hierarchy_level === 'zone') zoneIds.add(r.level_id);
          else if (r.hierarchy_level === 'branch') branchIds.add(r.level_id);
        });
        zones.forEach(z => { if (conferenceIds.has(z.conference_id)) zoneIds.add(z.id); });
        branches.forEach(b => { if (zoneIds.has(b.zone_id)) branchIds.add(b.id); });
      }

      const scopedBranches = branches.filter(b => branchIds.has(b.id));
      const scopedZones = zones.filter(z => zoneIds.has(z.id));
      const scopedConfs = conferences.filter(c => conferenceIds.has(c.id));
      const scopedMembers = members.filter(m => branchIds.has(m.branch_id));

      const bStats: BranchStat[] = scopedBranches.map(b => ({
        name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name,
        members: scopedMembers.filter(m => m.branch_id === b.id).length,
        active: scopedMembers.filter(m => m.branch_id === b.id && m.is_active).length,
      })).sort((a, b) => b.members - a.members);

      const zStats: ZoneStat[] = scopedZones.map(z => {
        const zoneBranches = scopedBranches.filter(b => b.zone_id === z.id);
        const zoneBranchIds = new Set(zoneBranches.map(b => b.id));
        return {
          name: z.name,
          members: scopedMembers.filter(m => zoneBranchIds.has(m.branch_id)).length,
          branches: zoneBranches.length,
        };
      }).sort((a, b) => b.members - a.members);

      const cStats: ConferenceStat[] = scopedConfs.map(c => {
        const confZones = scopedZones.filter(z => z.conference_id === c.id);
        const confZoneIds = new Set(confZones.map(z => z.id));
        const confBranchIds = new Set(scopedBranches.filter(b => confZoneIds.has(b.zone_id)).map(b => b.id));
        return {
          name: c.name,
          members: scopedMembers.filter(m => confBranchIds.has(m.branch_id)).length,
          zones: confZones.length,
        };
      }).sort((a, b) => b.members - a.members);

      setBranchStats(bStats);
      setZoneStats(zStats);
      setConferenceStats(cStats);
      setLoading(false);
    };
    fetchData();
  }, [userRoles, user]);

  const totalMembers = branchStats.reduce((s, b) => s + b.members, 0);
  const totalActive = branchStats.reduce((s, b) => s + b.active, 0);
  const activeRate = totalMembers > 0 ? Math.round((totalActive / totalMembers) * 100) : 0;

  const branchChartConfig = Object.fromEntries(
    branchStats.map((b, i) => [b.name, { label: b.name, color: CHART_COLORS[i % CHART_COLORS.length] }])
  );

  const conferenceChartConfig = Object.fromEntries(
    conferenceStats.map((c, i) => [c.name, { label: c.name, color: CHART_COLORS[i % CHART_COLORS.length] }])
  );

  const zoneChartConfig = Object.fromEntries(
    zoneStats.map((z, i) => [z.name, { label: z.name, color: CHART_COLORS[i % CHART_COLORS.length] }])
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  const scopeLabel = highestLevel
    ? `${highestLevel.charAt(0).toUpperCase()}${highestLevel.slice(1)}-scope reports`
    : 'Reports';

  return (
    <DashboardLayout>
      <div className="page-header flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl">Reports</h1>
          <p className="page-description text-sm">{scopeLabel} — statistics auto-filtered to your assigned hierarchy.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')} className="h-10 w-10 rounded-full" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <ExportMenu
            rows={branchStats.map(b => ({ Branch: b.name, Members: b.members, Active: b.active }))}
            filename="branch-report"
            title="TUCASA Branch Report"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <Card className="premium-card-hover stat-card p-3 sm:p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl sm:text-3xl font-bold font-display">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card className="premium-card-hover stat-card p-3 sm:p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl sm:text-3xl font-bold font-display">{activeRate}%</div>
          </CardContent>
        </Card>
        <Card className="premium-card-hover stat-card p-3 sm:p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Zones</CardTitle>
            <MapPin className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl sm:text-3xl font-bold font-display">{zoneStats.length}</div>
          </CardContent>
        </Card>
        <Card className="premium-card-hover stat-card p-3 sm:p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-1 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Conferences</CardTitle>
            <Building2 className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl sm:text-3xl font-bold font-display">{conferenceStats.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Members by Branch - Bar Chart */}
      <Card className="premium-card-hover mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-display">Members by Branch</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Total and active members per branch</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
              {branchStats.length > 0 ? (
            <ChartContainer config={branchChartConfig} className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="membersGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0.98} />
                      <stop offset="100%" stopColor="hsl(142, 60%, 35%)" stopOpacity={0.86} />
                    </linearGradient>
                    <linearGradient id="activeGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(210, 80%, 60%)" stopOpacity={0.98} />
                      <stop offset="100%" stopColor="hsl(210, 80%, 50%)" stopOpacity={0.86} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="members" fill="url(#membersGradient)" radius={[8, 8, 0, 0]} animationDuration={900} name="Total" />
                  <Bar dataKey="active" fill="url(#activeGradient)" radius={[8, 8, 0, 0]} animationDuration={900} name="Active" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No branch data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Members by Conference - Pie Chart */}
        <Card className="premium-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg font-display">Members by Conference</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Distribution across conferences</CardDescription>
          </CardHeader>
          <CardContent>
            {conferenceStats.length > 0 ? (
              <ChartContainer config={conferenceChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={conferenceStats}
                    dataKey="members"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, members }) => `${name}: ${members}`}
                    labelLine={false}
                  >
                    {conferenceStats.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">No conference data</p>
            )}
          </CardContent>
        </Card>

        {/* Members by Zone - Bar Chart */}
        <Card className="premium-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg font-display">Members by Zone</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Member count per zone</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {zoneStats.length > 0 ? (
              <ChartContainer config={zoneChartConfig} className="h-[250px] w-full">
                <BarChart data={zoneStats} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="members" fill="hsl(38, 90%, 55%)" radius={[0, 4, 4, 0]} name="Members" />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">No zone data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
