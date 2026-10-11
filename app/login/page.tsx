'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabase/client';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from '../../lib/icons';
import { BrandWordmark } from '../brand';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const { error: signError } = await createBrowserSupabase().auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });

    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="app-bare">
      <div className="auth ops-auth">
        <main className="auth-main">
          <div className="ops-auth-mark brand">
            <BrandWordmark height={34} tagline="Operator console" />
          </div>
          <div className="auth-body ops-auth-card">
            <header className="auth-header">
              <h1>Sign in</h1>
              <p>Every OmniChat shop in one place. Only operators can open this console.</p>
            </header>
            <form className="auth-form" onSubmit={onSubmit}>
              <div className="auth-fields">
                <label className="auth-field">
                  <span className="sr-only">Email</span>
                  <span className="input-affix has-icon">
                    <Mail size={18} className="input-affix-icon" aria-hidden="true" />
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      placeholder="Email address"
                      required
                      autoFocus
                    />
                  </span>
                </label>
                <label className="auth-field">
                  <span className="sr-only">Password</span>
                  <span className="input-affix has-icon">
                    <Lock size={18} className="input-affix-icon" aria-hidden="true" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Password"
                      required
                    />
                    <button
                      type="button"
                      className="input-affix-button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              </div>
              {error ? (
                <p className="error mt-0" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="primary lg" type="submit" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
                {pending ? (
                  <Loader2 size={18} className="spin" aria-hidden="true" />
                ) : (
                  <ArrowRight size={18} aria-hidden="true" />
                )}
              </button>
            </form>
          </div>
          <div className="auth-foot ops-auth-foot">Shop owners sign in to their own desk, not here.</div>
        </main>
      </div>
    </div>
  );
}
