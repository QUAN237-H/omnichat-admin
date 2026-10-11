'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../lib/supabase/client';
import { Loader2, LogOut } from '../lib/icons';

/** `variant="nav"` is the sidebar row; `icon` is the phone header button. */
export default function SignOutButton({ variant = 'button' }: { variant?: 'button' | 'nav' | 'icon' }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createBrowserSupabase().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const icon = pending ? (
    <Loader2 size={17} className="spin" aria-hidden="true" />
  ) : (
    <LogOut size={17} aria-hidden="true" />
  );

  if (variant === 'nav') {
    return (
      <button type="button" className="app-nav-link app-nav-signout" onClick={() => void signOut()} disabled={pending}>
        <span className="app-nav-art">{icon}</span>
        Sign out
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button type="button" className="ghost icon" onClick={() => void signOut()} disabled={pending} aria-label="Sign out">
        {icon}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => void signOut()} disabled={pending}>
      {icon}
      Sign out
    </button>
  );
}
