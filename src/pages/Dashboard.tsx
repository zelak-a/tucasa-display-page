import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users, ShieldCheck, FileText, Network, UserCircle,
  Camera, Shield, Pencil,
  type LucideIcon,
} from 'lucide-react';
import {
  HERO_BACKGROUNDS,
  getStoredHeroBg,
  getStoredAvatar,
  setStoredAvatar,
} from '@/lib/heroBackgrounds';

interface MyMembership {
  id?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  institution: string | null;
  is_active: boolean;
  branch_name?: string;
  zone_name?: string;
  conference_name?: string;
  union_name?: string;
}

const ALL_MODULES: Array<{ to: string; title: string; desc: string; Icon: LucideIcon; accent: string; unionOnly?: boolean }> = [
  { to: '/members',    title: 'Members',    desc: 'Tazama waumini kwa hierarkia yako.', Icon: Users,       accent: 'from-church-blue to-church-blue-light' },
  { to: '/leadership', title: 'Leadership', desc: 'Viongozi wa ngazi yako.',            Icon: ShieldCheck, accent: 'from-gold to-gold-light' },
  { to: '/reports',    title: 'Reports',    desc: 'Ripoti za ngazi yako.',              Icon: FileText,    accent: 'from-emerald to-emerald' },
  { to: '/hierarchy',  title: 'Hierarchy',  desc: 'Union, Conferences, Zones na Branches.', Icon: Network, accent: 'from-bronze to-gold', unionOnly: true },
];

export default function Dashboard() {
  const { user, profile, userRoles, highestLevel, isUnionLeader, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);
  const [bgId] = useState<string>(getStoredHeroBg());
  const [avatar, setAvatar] = useState<string | null>(user ? getStoredAvatar(user.id) : null);
  const [activeModule, setActiveModule] = useState<{ title: string; to: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', institution: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isPlainMember = userRoles.length === 0 && !isSuperAdmin;
  const visibleModules = ALL_MODULES.filter(m => !m.unionOnly || isUnionLeader);

  useEffect(() => {
    if (user) setAvatar(getStoredAvatar(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await (supabase.from('members') as any)
        .select('id, full_name, email, phone, institution, is_active, branch_id')
        .eq('user_id', user.id).maybeSingle();
      if (!m) return;
      const { data: b } = await supabase.from('branches').select('name, zone_id').eq('id', (m as any).branch_id).maybeSingle();
      const { data: z } = b ? await supabase.from('zones').select('name, conference_id').eq('id', (b as any).zone_id).maybeSingle() : { data: null };
      const { data: c } = z ? await supabase.from('conferences').select('name, union_id').eq('id', (z as any).conference_id).maybeSingle() : { data: null };
      const { data: u } = c ? await supabase.from('unions').select('name').eq('id', (c as any).union_id).maybeSingle() : { data: null };
      setMyMembership({
        id: (m as any).id,
        full_name: (m as any).full_name,
        email: (m as any).email,
        phone: (m as any).phone,
        institution: (m as any).institution,
        is_active: (m as any).is_active,
        branch_name: (b as any)?.name,
        zone_name: (z as any)?.name,
        conference_name: (c as any)?.name,
        union_name: (u as any)?.name,
      });
    })();
  }, [user]);

  const currentBg = HERO_BACKGROUNDS.find(b => b.id === bgId) || HERO_BACKGROUNDS[0];
  const heroStyle = { ['--hero-bg-image' as any]: `url(${currentBg.url})`, transition: 'background-image 0.4s ease' } as React.CSSProperties;

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
      setStoredAvatar(user.id, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleModuleTap = (module: { title: string; to: string }) => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setActiveModule(module);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate(module.to);
  };

  const levelLabel = highestLevel
    ? highestLevel.charAt(0).toUpperCase() + highestLevel.slice(1) + ' Leader'
    : 'Member';

  return (
    <DashboardLayout>
      {/* ───── HERO ───── */}
      <section className="relative hero-bg px-4 py-5 sm:p-10 mb-8" style={heroStyle}>
        <div className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-8">
          {/* LEFT: profile */}
          <div className="flex items-center gap-5 sm:gap-6 text-white">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/70 shadow-xl bg-white/10 backdrop-blur-sm">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle className="w-16 h-16 text-white/80" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full gradient-gold border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Badilisha picha"
                type="button"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl leading-tight text-white truncate">
                {profile?.full_name || 'Mwanachama'}
              </h1>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-sm">
                <Shield className="w-3.5 h-3.5 text-gold-light" />
                <span className="text-white/95">{levelLabel}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: sign out action */}
          <div className="absolute top-4 right-4 sm:static flex flex-col items-center sm:items-end gap-2 text-center sm:text-right text-white">
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="rounded-full border-white/40 bg-white/20 text-white hover:bg-white/40 hover:text-black shadow-lg"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      {/* ───── MODULE CARDS ───── */}
      <section className="mb-8">
        {activeModule && (
          <>
            <div
              className="fixed inset-0 z-40 bg-[#0a1228]/45 backdrop-blur-[2px]"
              onClick={() => setActiveModule(null)}
            />
            <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
              <div className="w-full max-w-[420px] animate-slide-down">
              <div className="glass-card p-5 border border-white/25 shadow-2xl backdrop-blur-2xl bg-gradient-to-br from-white/25 via-white/12 to-white/5 rounded-[28px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Chaguo la haraka</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{activeModule.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule(null)}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
                  >
                    Funga
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigate(activeModule.to);
                    setActiveModule(null);
                  }}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-church-blue to-church-blue-light px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-church-blue/20"
                >
                  Fungua {activeModule.title}
                </button>
              </div>
              </div>
            </div>
          </>
        )}

        {!isPlainMember && (
          <div className="glass-card p-3 sm:p-5 xl:p-6 border border-white/15 shadow-2xl">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
              {visibleModules.map((module) => (
                <button
                  key={module.to}
                  type="button"
                  onClick={() => handleModuleTap(module)}
                  className="glass-card-hover group h-full p-3 sm:p-5 flex flex-col items-center justify-center text-center overflow-hidden relative focus:outline-none focus-visible:ring-2 focus-visible:ring-church-blue/50"
                >
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${module.accent} opacity-10 group-hover:opacity-25 group-hover:scale-105 transition-all duration-500`} />
                  <div className={`inline-flex items-center justify-center mx-auto mb-3 w-10 h-10 sm:w-12 sm:h-12 rounded-3xl bg-gradient-to-br ${module.accent} text-white shadow-xl group-hover:scale-110 transition-transform`}>
                    <module.Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground leading-tight">{module.title}</h3>

                  <div className="hidden md:block absolute left-1/2 -bottom-6 transform -translate-x-1/2 pointer-events-none">
                    <module.Icon className="reflection-icon w-10 h-10 text-foreground/60" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {myMembership && (
        <Card className="glass-card mb-6">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-display">
              <UserCircle className="h-5 w-5 text-church-blue" /> Taarifa Zangu za Uanachama
            </CardTitle>
            <Button
              variant="outline" size="sm" className="gap-1"
              onClick={() => {
                setEditForm({
                  full_name: myMembership.full_name || '',
                  phone: myMembership.phone || '',
                  institution: myMembership.institution || '',
                });
                setEditOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Hariri
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Jina:</span> <span className="font-medium">{myMembership.full_name}</span></div>
            <div><span className="text-muted-foreground">Hali:</span> <span className="font-medium">{myMembership.is_active ? 'Active' : 'Inactive'}</span></div>
            {myMembership.phone && <div><span className="text-muted-foreground">Simu:</span> {myMembership.phone}</div>}
            {myMembership.institution && <div><span className="text-muted-foreground">Chuo:</span> {myMembership.institution}</div>}
            {myMembership.union_name && <div><span className="text-muted-foreground">Union:</span> {myMembership.union_name}</div>}
            {myMembership.conference_name && <div><span className="text-muted-foreground">Conference:</span> {myMembership.conference_name}</div>}
            {myMembership.zone_name && <div><span className="text-muted-foreground">Zone:</span> {myMembership.zone_name}</div>}
            {myMembership.branch_name && <div><span className="text-muted-foreground">Branch:</span> {myMembership.branch_name}</div>}
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hariri Taarifa Zangu</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user || !myMembership?.id) return;
              setSavingProfile(true);
              const payload = {
                full_name: editForm.full_name.trim(),
                phone: editForm.phone.trim() || null,
                institution: editForm.institution.trim() || null,
              };
              const { error: mErr } = await supabase.from('members').update(payload).eq('id', myMembership.id);
              const { error: pErr } = await supabase.from('profiles').update(payload).eq('user_id', user.id);
              setSavingProfile(false);
              if (mErr || pErr) {
                toast({ title: 'Hitilafu', description: (mErr || pErr)?.message, variant: 'destructive' });
                return;
              }
              toast({ title: 'Taarifa zimehifadhiwa' });
              setEditOpen(false);
              setMyMembership(prev => prev ? { ...prev, ...payload } : prev);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Jina kamili</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Namba ya simu</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Taasisi / Chuo</Label>
              <Input value={editForm.institution} onChange={e => setEditForm(f => ({ ...f, institution: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Note: Tawi (branch) haliwezi kubadilishwa hapa. Wasiliana na kiongozi wa tawi lako kama umehama.</p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Ghairi</Button>
              <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Inahifadhi...' : 'Hifadhi'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isPlainMember && !myMembership && (
        <Card className="border-dashed glass-card">
          <CardContent className="py-10 text-center px-4">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-display text-lg mb-2">Taarifa zako hazipatikani</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Wasiliana na kiongozi wa tawi lako.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
