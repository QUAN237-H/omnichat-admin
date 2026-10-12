import type { Metadata } from 'next';
import { aiFeatureLabel } from '../../../lib/format';
import type { FeatureOverride } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { StatePanel } from '../../state-screen';
import GlobalFlagToggle from './flag-toggle';

export const metadata: Metadata = { title: 'Flags' };

type FlagsResponse = { flags: FeatureOverride[]; generatedAt: string };

export default async function FlagsPage() {
  const result = await workerGet<FlagsResponse>('/admin/flags');
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <h1>Feature flags</h1>
        <p>Fleet defaults. Shop overrides on AI &amp; money win over these.</p>
      </header>

      <section className="ops-panel">
        <div className="ops-panel-head">
          <h2>Global</h2>
          <span className="ops-panel-count">{result.data.flags.length}</span>
        </div>
        <ul className="ops-list">
          {result.data.flags.map((flag) => (
            <li key={flag.feature}>
              <div className="ops-list-main">
                <div className="ops-list-top">
                  <span className="ops-list-who">{aiFeatureLabel(flag.feature)}</span>
                  <span className={flag.enabled ? 'badge' : 'badge danger'}>
                    {flag.enabled ? 'On' : 'Off'}
                  </span>
                </div>
                {flag.reason ? <div className="ops-list-status">{flag.reason}</div> : null}
              </div>
              <GlobalFlagToggle feature={flag.feature} enabled={flag.enabled} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
