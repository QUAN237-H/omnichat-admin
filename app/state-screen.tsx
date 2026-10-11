import type { ReactNode } from 'react';
import { Art3D, type Art3DName, BrandWordmark } from './brand';
import SignOutButton from './sign-out-button';

type Props = { status: number; error: string; code?: string };

function copyFor({ status, error, code }: Props): { art: Art3DName; title: string; body: ReactNode } {
  if (code === 'not_admin') {
    return {
      art: 'key',
      title: 'This account is not an operator',
      body: 'You are signed in, but your account is not on the internal admins list. Ask an owner to add you.',
    };
  }
  if (code === 'needs_migration') {
    return {
      art: 'gear',
      title: 'Admin tables are not set up yet',
      body: (
        <>
          Apply <code>0066_internal_admins.sql</code>, then add your account to <code>internal_admins</code>.
        </>
      ),
    };
  }
  if (status === 503) {
    return { art: 'clock', title: 'The worker is not answering', body: error };
  }
  return { art: 'bell', title: 'Something went wrong', body: error };
}

/** Full-screen refusal before the console frame exists (not an operator, tables missing). */
export function AccessScreen(props: Props) {
  const { art, title, body } = copyFor(props);
  return (
    <div className="app-bare">
      <main>
        <div className="ops-access-mark">
          <BrandWordmark height={30} tagline="Operator console" />
        </div>
        <div className="state-panel">
          <Art3D name={art} size={72} priority />
          <h1>{title}</h1>
          <p>{body}</p>
          <div className="actions">
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  );
}

/** The same message inside the console, when one read fails but the operator is in. */
export function StatePanel(props: Props) {
  const { art, title, body } = copyFor(props);
  return (
    <main>
      <div className="state-panel">
        <Art3D name={art} size={72} />
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
    </main>
  );
}
