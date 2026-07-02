import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Shield, Network, MapPin, GitBranch, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';

interface LeaderRow {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role_name: string;
  hierarchy_level: string;
  level_name: string;
  is_active: boolean;
  end_date: string | null;
}

function LeaderCard({ leader, canManage, onRemove, onToggleActive }: {
  leader: LeaderRow;
  canManage: boolean;
  onRemove: (id: string) => void;
  onToggleActive: (id: string, next: boolean) => void;
}) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{leader.user_name}</h3>
            {/* Email intentionally hidden in UI */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Shield className="h-2.5 w-2.5" />{leader.role_name}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{leader.hierarchy_level}</Badge>
              <Badge variant={leader.is_active ? 'default' : 'outline'} className="text-[10px]">
                {leader.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-muted-foreground">· {leader.level_name}</span>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-col gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => onToggleActive(leader.id, !leader.is_active)}>
                {leader.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(leader.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Leadership() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [overlay, setOverlay] = useState<null | { level: 'conferences' } | { level: 'zones'; conference: any } | { level: 'branches'; conference: any; zone: any }>(null);
  const [restoreOverlay, setRestoreOverlay] = useState<null | { level: 'branches'; conference: any; zone: any }>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string; email: string | null }[]>([]);
  const [unions, setUnions] = useState<{ id: string; name: string }[]>([]);
  const [conferences, setConferences] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string; conference_id: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; zone_id: string }[]>([]);

  const [form, setForm] = useState({ user_id: '', role_id: '', hierarchy_level: '' as string, level_id: '' });

  const canManage = hasPermission('manage_leaders');

  const { userRoles } = useAuth();

  const fetchData = async () => {
    const [urRes, rolesRes, profilesRes, unionsRes, confsRes, zonesRes, branchesRes] = await Promise.all([
      supabase.from('user_roles').select('*'),
      supabase.from('roles').select('id, name'),
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('unions').select('id, name'),
      supabase.from('conferences').select('id, name'),
      supabase.from('zones').select('id, name, conference_id'),
      supabase.from('branches').select('id, name, zone_id'),
    ]);

    setRoles(rolesRes.data || []);
    setProfiles(profilesRes.data || []);
    setUnions(unionsRes.data || []);
    setConferences(confsRes.data || []);
    setZones((zonesRes.data as any) || []);
    setBranches((branchesRes.data as any) || []);

    const roleMap = new Map((rolesRes.data || []).map(r => [r.id, r.name]));
    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const levelMap = new Map([
      ...(unionsRes.data || []).map(u => [u.id, u.name] as [string, string]),
      ...(confsRes.data || []).map(c => [c.id, c.name] as [string, string]),
      ...(zonesRes.data || []).map(z => [z.id, z.name] as [string, string]),
      ...(branchesRes.data || []).map(b => [b.id, b.name] as [string, string]),
    ]);

    // Compute accessible scope for current user
    const isUnion = userRoles.some(r => r.hierarchy_level === 'union');
    const isPlainMember = userRoles.length === 0;
    const allZones = (zonesRes.data as any[]) || [];
    const allBranches = (branchesRes.data as any[]) || [];

    let allowedConferences = new Set<string>();
    let allowedZones = new Set<string>();
    let allowedBranches = new Set<string>();

    if (isUnion) {
      allowedConferences = new Set((confsRes.data || []).map(c => c.id));
      allowedZones = new Set(allZones.map(z => z.id));
      allowedBranches = new Set(allBranches.map(b => b.id));
    } else {
      userRoles.forEach(r => {
        if (r.hierarchy_level === 'conference') allowedConferences.add(r.level_id);
        else if (r.hierarchy_level === 'zone') allowedZones.add(r.level_id);
        else if (r.hierarchy_level === 'branch') allowedBranches.add(r.level_id);
      });
      allZones.forEach(z => { if (allowedConferences.has(z.conference_id)) allowedZones.add(z.id); });
      allBranches.forEach(b => { if (allowedZones.has(b.zone_id)) allowedBranches.add(b.id); });
    }

    const enriched: LeaderRow[] = (urRes.data || [])
      .filter((ur: any) => {
        if (isUnion) return true;
        if (isPlainMember) return false;
        if (ur.hierarchy_level === 'union') return false;
        if (ur.hierarchy_level === 'conference') return allowedConferences.has(ur.level_id);
        if (ur.hierarchy_level === 'zone') return allowedZones.has(ur.level_id);
        if (ur.hierarchy_level === 'branch') return allowedBranches.has(ur.level_id);
        return false;
      })
      .map((ur: any) => {
        const prof = profileMap.get(ur.user_id);
        return {
          id: ur.id,
          user_id: ur.user_id,
          user_email: '',
          user_name: prof?.full_name || 'Unknown',
          role_name: roleMap.get(ur.role_id) || 'Unknown',
          hierarchy_level: ur.hierarchy_level,
          level_name: levelMap.get(ur.level_id) || 'Unknown',
          is_active: ur.is_active ?? true,
          end_date: ur.end_date ?? null,
        };
      });

    setLeaders(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [userRoles]);

  const openOverlayConferences = () => setOverlay({ level: 'conferences' });
  const openOverlayZones = (conference: any) => setOverlay({ level: 'zones', conference });
  const openOverlayBranches = (zone: any) => {
    if (!overlay || overlay.level !== 'zones') return;
    setOverlay({ level: 'branches', conference: overlay.conference, zone });
  };
  const closeOverlay = () => setOverlay(null);

  const levelOptions = () => {
    switch (form.hierarchy_level) {
      case 'union': return unions;
      case 'conference': return conferences;
      case 'zone': return zones;
      case 'branch': return branches;
      default: return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id || !form.role_id || !form.hierarchy_level || !form.level_id) return;

    const { error } = await supabase.from('user_roles').insert({
      user_id: form.user_id,
      role_id: form.role_id,
      hierarchy_level: form.hierarchy_level as any,
      level_id: form.level_id,
    });

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Leader assigned' });
    setDialogOpen(false);
    setForm({ user_id: '', role_id: '', hierarchy_level: '', level_id: '' });
    fetchData();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Leader removed' });
    fetchData();
  };

  const handleToggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: next, end_date: next ? null : new Date().toISOString() } as any)
      .eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: next ? 'Leader activated' : 'Leader deactivated' });
    fetchData();
  };

  return (
    <DashboardLayout>
      <SEO
        title="Leadership"
        description="Assign and manage leadership roles across TUCASA hierarchy levels."
      />
      <div className="premium-card p-5 mb-6 border border-white/10 shadow-2xl">
        <div className="page-header mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl sm:text-3xl">Leadership</h1>
            <p className="page-description text-sm">Manage leaders across all organizational levels.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')} className="h-10 w-10 rounded-full" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={openOverlayConferences} className="h-10 w-10 rounded-full">
              <Network className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{leaders.length} leader{leaders.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Assign Leader</span><span className="sm:hidden">Assign</span></Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader><DialogTitle>Assign Leader</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role_id} onValueChange={v => setForm(f => ({ ...f, role_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={form.hierarchy_level} onValueChange={v => setForm(f => ({ ...f, hierarchy_level: v, level_id: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="union">Union</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="zone">Zone</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.hierarchy_level && (
                  <div className="space-y-2">
                    <Label>Assign to</Label>
                    <Select value={form.level_id} onValueChange={v => setForm(f => ({ ...f, level_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {levelOptions().map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full">Assign</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : leaders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No leaders assigned yet.</p>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-0">
            {leaders.map(l => (
              <LeaderCard key={l.id} leader={l} canManage={canManage} onRemove={handleRemove} onToggleActive={handleToggleActive} />
            ))}
          </div>

          {/* Desktop table view */}
          <Card className="hidden md:block premium-card border border-white/10">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaders.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{l.user_name}</span>
                            {/* email hidden */}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />{l.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{l.hierarchy_level}</Badge>
                        </TableCell>
                        <TableCell>{l.level_name}</TableCell>
                        <TableCell>
                          <Badge variant={l.is_active ? 'default' : 'outline'}>
                            {l.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleToggleActive(l.id, !l.is_active)}>
                                {l.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleRemove(l.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {overlay && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-50/60 backdrop-blur-3xl" onClick={closeOverlay} />
          <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="w-full max-w-3xl">
              <Card className="premium-card border border-white/20 bg-white/75 shadow-2xl backdrop-blur-2xl">
                <CardContent className="p-5 rounded-[32px] shadow-inner shadow-slate-900/5">
                  <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-[28px] border border-slate-200/60 bg-white/50 p-3 shadow-inner shadow-slate-900/5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {overlay.level === 'conferences' ? (
                        conferences.map(c => (
                          <button key={c.id} onClick={() => openOverlayZones(c)} className="text-left group">
                            <Card className="premium-card-hover bg-white/90 border border-slate-200/80 hover:border-slate-300 transition-colors">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-200/70 to-blue-200/70 flex items-center justify-center shrink-0 text-sky-700 shadow-sm shadow-sky-400/10">
                                  <MapPin className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-slate-950 truncate">{c.name}</h3>
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        ))
                      ) : overlay.level === 'zones' ? (
                        zones.filter(z => z.conference_id === overlay.conference.id).map(z => (
                          <button key={z.id} onClick={() => openOverlayBranches(z)} className="text-left group">
                            <Card className="premium-card-hover bg-white/90 border border-slate-200/80 hover:border-slate-300 transition-colors">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-200/70 to-fuchsia-200/70 flex items-center justify-center shrink-0 text-violet-700 shadow-sm shadow-violet-400/10">
                                  <GitBranch className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-slate-950 truncate">{z.name}</h3>
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        ))
                      ) : (
                        branches.filter(b => b.zone_id === overlay.zone.id).map(b => (
                          <div key={b.id} className="text-left group">
                            <Card className="premium-card-hover bg-white/90 border border-slate-200/80 hover:border-slate-300 transition-colors">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-slate-950 truncate">{b.name}</h3>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
