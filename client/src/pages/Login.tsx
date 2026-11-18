import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* empty body */ }
  return { ok: res.ok, data };
}

const TITLES: Record<Mode, [string, string]> = {
  login: ['Welcome back', 'Log in to see your reports and check new addresses.'],
  signup: ['Create your account', 'Your first 2 reports are free while early-bird spots last. No card needed.'],
  forgot: ['Set or reset your password', 'Enter your email and we’ll send you a link. Had an account before our update? Use this to set your password — your credits are still there.'],
  reset: ['Choose a new password', 'At least 8 characters.'],
};

export default function Login({ initialMode }: { initialMode?: Mode }) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>(
    initialMode || (params.get('mode') === 'signup' ? 'signup' : 'login'),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsReset, setNeedsReset] = useState(false);

  useEffect(() => {
    setError('');
    setNotice('');
    setNeedsReset(false);
  }, [mode]);

  const [title, subtitle] = TITLES[mode];

  async function finishSignIn() {
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    setLocation('/');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setNeedsReset(false);
    try {
      if (mode === 'login') {
        const r = await post('/api/auth/login', { email, password });
        if (r.ok) return finishSignIn();
        setError(r.data.message || 'Login failed.');
        setNeedsReset(r.data.code === 'needs_reset');
      } else if (mode === 'signup') {
        const r = await post('/api/auth/register', { email, password, firstName: firstName || undefined });
        if (r.ok) return finishSignIn();
        setError(r.data.message || 'Sign-up failed.');
        setNeedsReset(r.data.code === 'needs_reset');
      } else if (mode === 'forgot') {
        const r = await post('/api/auth/forgot-password', { email });
        if (r.ok) setNotice(r.data.message || 'Check your inbox for a link.');
        else setError(r.data.message || 'Something went wrong.');
      } else {
        const r = await post('/api/auth/reset-password', { token, password });
        if (r.ok) return finishSignIn();
        setError(r.data.message || 'Could not set the password.');
      }
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = { login: 'Log in', signup: 'Create account', forgot: 'Send link', reset: 'Save password' }[mode];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 h-16 flex items-center">
        <a href="/" aria-label="ScoreCasa home"><Logo className="h-9 w-auto" /></a>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-10">
        <div className="w-full max-w-md glass-card rounded-2xl p-7 sm:p-9">
          <h1 className="text-3xl font-semibold text-gray-50 mb-2">{title}</h1>
          <p className="text-sm text-gray-400 mb-7 leading-relaxed">{subtitle}</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-gray-300">First name <span className="text-gray-500">(optional)</span></Label>
                <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-first-name" />
              </div>
            )}
            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
              </div>
            )}
            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300">{mode === 'reset' ? 'New password' : 'Password'}</Label>
                  {mode === 'login' && (
                    <button type="button" className="text-xs text-cyan-300 hover:underline" onClick={() => setMode('forgot')}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'login' ? 1 : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
                {mode !== 'login' && <p className="text-xs text-gray-500">At least 8 characters.</p>}
              </div>
            )}

            {error && (
              <div role="alert" className="text-sm rounded-lg border border-red-400/30 bg-red-400/10 text-red-200 px-3 py-2">
                {error}
                {needsReset && (
                  <button type="button" className="block mt-1 underline" onClick={() => setMode('forgot')}>
                    Send me a link to set my password
                  </button>
                )}
              </div>
            )}
            {notice && (
              <div role="status" className="text-sm rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 px-3 py-2">
                {notice}
              </div>
            )}

            <Button type="submit" className="btn-gradient-purple w-full h-11" disabled={busy} data-testid="button-submit">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </form>

          <div className="mt-6 text-sm text-gray-400 text-center">
            {mode === 'login' && (
              <>New to ScoreCasa?{' '}
                <button className="text-cyan-300 hover:underline" onClick={() => setMode('signup')} data-testid="link-to-signup">Create an account</button>
              </>
            )}
            {mode === 'signup' && (
              <>Already have an account?{' '}
                <button className="text-cyan-300 hover:underline" onClick={() => setMode('login')} data-testid="link-to-login">Log in</button>
              </>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <button className="text-cyan-300 hover:underline" onClick={() => setMode('login')}>Back to log in</button>
            )}
          </div>

          {mode === 'signup' && (
            <p className="mt-6 text-xs text-gray-500 text-center">
              By creating an account you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
