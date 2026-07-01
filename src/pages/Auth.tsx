import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import pcmLogo from '@/assets/pcm-logo.png.asset.json';
import { LogIn, UserPlus, X } from 'lucide-react';

type Row = { id: string; name: string };

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-white font-semibold text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">{label}</Label>
    {children}
  </div>
);

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [unionName, setUnionName] = useState('Southern Tanzania Union');
  const [conferences, setConferences] = useState<Row[]>([]);
  const [zones, setZones] = useState<(Row & { conference_id: string })[]>([]);
  const [branches, setBranches] = useState<(Row & { zone_id: string })[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState<'signin' | 'signup' | null>(null);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [u, c, z, b] = await Promise.all([
        supabase.from('unions').select('id, name').limit(1).maybeSingle(),
        supabase.from('conferences').select('id, name').order('name'),
        supabase.from('zones').select('id, name, conference_id').order('name'),
        supabase.from('branches').select('id, name, zone_id').order('name'),
      ]);
      if (u.data?.name) setUnionName(u.data.name);
      setConferences(c.data || []);
      setZones(z.data || []);
      setBranches(b.data || []);
    })();
  }, []);

  const filteredZones = zones.filter(z => z.conference_id === conferenceId);
  const filteredBranches = branches.filter(b => b.zone_id === zoneId);

  const validatePhone = (value: string) => value.replace(/\D/g, '').length >= 9;

  const resetForm = () => setOpenForm(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      toast({ title: 'Namba si sahihi', description: 'Tafadhali weka namba ya simu sahihi.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signIn(phone, password);
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Imeshindikana kuingia', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(phone)) {
      toast({ title: 'Namba si sahihi', description: 'Tafadhali weka namba ya simu sahihi.', variant: 'destructive' });
      return;
    }
    if (!conferenceId || !zoneId || !branchId) {
      toast({ title: 'Chagua hierarchy', description: 'Tafadhali chagua Conference, Zone na Branch.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signUp(phone, password, fullName, branchId, institution);
      await signIn(phone, password);
      navigate('/welcome');
    } catch (err: any) {
      toast({ title: 'Usajili umeshindikana', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formCardBase =
    'relative w-full max-h-[95vh] overflow-y-auto rounded-[30px] p-5 ' +
    'bg-gradient-to-br from-white/25 via-white/12 to-white/5 ' +
    'border border-white/30 shadow-[0_32px_90px_-30px_rgba(2,8,23,0.75)] ' +
    'backdrop-blur-[32px] saturate-[180%] animate-slide-down';

  return (
    <div className="relative z-10 min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(1200px 700px at 10% -10%, rgba(96,165,250,0.5), transparent 60%)," +
          "radial-gradient(900px 600px at 100% 0%, rgba(186,230,253,0.35), transparent 60%)," +
          "radial-gradient(900px 700px at 50% 120%, rgba(59,130,246,0.45), transparent 60%)," +
          "linear-gradient(180deg, #173A82 0%, #1E4AA0 50%, #173A82 100%)",
      }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.6) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      {/* Top-center form panels */}
      {openForm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#0a1228]/45 backdrop-blur-[2px] transition-opacity"
            onClick={resetForm}
          />
          <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="w-full max-w-[420px]">
            {openForm === 'signin' && (
              <div className={formCardBase}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                  aria-label="Funga"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-white font-semibold mb-5 text-center text-lg tracking-[0.02em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                  Ingia kwenye akaunti yako
                </h2>
                <form onSubmit={handleSignIn} className="space-y-3">
                  <Field label="Namba ya Simu">
                    <Input
                      id="signin-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="0712345678"
                      className="auth-input-readable"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Nenosiri">
                    <Input
                      id="signin-password"
                      type="password"
                      className="auth-input-readable"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" className="auth-submit w-full mt-1" disabled={loading}>
                    {loading ? 'Inaingia...' : 'Ingia'}
                  </Button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="auth-link w-full text-center text-sm py-1"
                  >
                    Ghairi
                  </button>
                </form>
              </div>
            )}

            {openForm === 'signup' && (
              <div className={formCardBase}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                  aria-label="Funga"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-white font-semibold mb-5 text-center text-lg tracking-[0.02em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                  Fungua akaunti mpya
                </h2>
                <form onSubmit={handleSignUp} className="space-y-3">
                  <Field label="Jina Kamili">
                    <Input
                      id="signup-name"
                      className="auth-input-readable"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Namba ya Simu">
                    <Input
                      id="signup-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="0712345678"
                      className="auth-input-readable"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Nenosiri (angalau herufi 6)">
                    <Input
                      id="signup-password"
                      type="password"
                      className="auth-input-readable"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </Field>
                  <Field label="Chuo / Taasisi (hiari)">
                    <Input
                      id="signup-institution"
                      className="auth-input-readable"
                      value={institution}
                      onChange={e => setInstitution(e.target.value)}
                      placeholder="mfano, UDSM"
                    />
                  </Field>
                  <Field label="Union">
                    <Input className="auth-input-readable disabled:opacity-100" value={unionName} disabled />
                  </Field>
                  <Field label="Conference *">
                    <Select value={conferenceId} onValueChange={v => { setConferenceId(v); setZoneId(''); setBranchId(''); }}>
                      <SelectTrigger className="auth-select-readable h-11 rounded-2xl text-slate-900 data-[placeholder]:text-slate-500 disabled:opacity-100 disabled:bg-white/15 disabled:text-white disabled:data-[placeholder]:text-white/80">
                        <SelectValue placeholder="Chagua Conference" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/20 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl">
                        {conferences.map(c => <SelectItem key={c.id} value={c.id} className="focus:bg-church-blue/10 focus:text-church-blue-dark">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Zone *">
                    <Select value={zoneId} onValueChange={v => { setZoneId(v); setBranchId(''); }} disabled={!conferenceId}>
                      <SelectTrigger className="auth-select-readable h-11 rounded-2xl text-slate-900 data-[placeholder]:text-slate-500 disabled:opacity-100 disabled:bg-white/15 disabled:text-white disabled:data-[placeholder]:text-white/80">
                        <SelectValue placeholder={conferenceId ? 'Chagua Zone' : 'Chagua Conference kwanza'} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/20 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl">
                        {filteredZones.map(z => <SelectItem key={z.id} value={z.id} className="focus:bg-church-blue/10 focus:text-church-blue-dark">{z.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Branch / Tawi *">
                    <Select value={branchId} onValueChange={setBranchId} disabled={!zoneId}>
                      <SelectTrigger className="auth-select-readable h-11 rounded-2xl text-slate-900 data-[placeholder]:text-slate-500 disabled:opacity-100 disabled:bg-white/15 disabled:text-white disabled:data-[placeholder]:text-white/80">
                        <SelectValue placeholder={zoneId ? 'Chagua Branch' : 'Chagua Zone kwanza'} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/20 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl">
                        {filteredBranches.map(b => <SelectItem key={b.id} value={b.id} className="focus:bg-church-blue/10 focus:text-church-blue-dark">{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="submit" className="auth-submit w-full mt-1" disabled={loading}>
                    {loading ? 'Inasajili...' : 'Jisajili'}
                  </Button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="auth-link w-full text-center text-sm py-1"
                  >
                    Ghairi
                  </button>
                </form>
              </div>
            )}
            </div>
          </div>
        </>
      )}

      {/* Content wrapper */}
      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 animate-float">
          <img
            src={pcmLogo.url}
            alt="TUCASA Logo"
            className="w-24 h-24 object-contain drop-shadow-[0_0_30px_rgba(96,165,250,0.5)]"
          />
        </div>

        {/* TUCASA STUM Text */}
        <h1
          className="text-3xl md:text-4xl font-bold tracking-[0.15em] text-white mb-3 text-center"
          style={{ textShadow: "0 0 30px rgba(96,165,250,0.4)" }}
        >
          TUCASA STUM
        </h1>
        <p className="text-sm text-white/80 mb-10 text-center max-w-xs italic">
          Mfumo wa Usimamizi wa Wanachama
        </p>

        {/* Action buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 mb-4">
          <Button
            onClick={() => setOpenForm('signin')}
            className="auth-cta auth-cta-primary flex-1 h-12 rounded-full text-base font-semibold"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Ingia
          </Button>
          <Button
            onClick={() => setOpenForm('signup')}
            className="auth-cta auth-cta-secondary flex-1 h-12 rounded-full text-base font-semibold text-white border-silver"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Jisajili
          </Button>
        </div>

        {/* Subtle shimmer line */}
        <div className="mt-10 w-32 h-[2px] rounded-full overflow-hidden bg-white/10">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#60A5FA] to-transparent animate-shimmer-bar" />
        </div>
      </div>
    </div>
  );
}

