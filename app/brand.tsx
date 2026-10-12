import type { CSSProperties } from 'react';
import Image from 'next/image';

/** Unique ops-console clay icons (not the owner Desk set). */
export type OpsArtName =
  | 'attention'
  | 'shops'
  | 'waitlist'
  | 'costs'
  | 'flags'
  | 'incidents'
  | 'platform'
  | 'audit';

/** Legacy Desk clay names still used on empty states / older panels. */
export type Art3DName =
  | OpsArtName
  | 'analytics'
  | 'assistant'
  | 'bell'
  | 'box'
  | 'chats'
  | 'check'
  | 'clock'
  | 'contacts'
  | 'gear'
  | 'key'
  | 'phone-connected'
  | 'phone-link'
  | 'sale'
  | 'status'
  | 'store';

/** File stem under /brand/ops — Platform uses a unique name so caches cannot reuse Attention. */
const OPS_ART_FILE: Partial<Record<OpsArtName, string>> = {
  attention: 'attention',
  shops: 'shops',
  waitlist: 'waitlist',
  costs: 'costs',
  flags: 'flags',
  incidents: 'incidents',
  platform: 'platform-nodes',
  audit: 'audit',
};

/** Glossy clay icon — ops set lives under /brand/ops, Desk leftovers under /brand/3d. */
export function Art3D({
  name,
  size = 48,
  className,
  priority,
}: {
  name: Art3DName;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const opsFile = (OPS_ART_FILE as Record<string, string | undefined>)[name];
  const src = opsFile ? `/brand/ops/${opsFile}.webp` : `/brand/3d/${name}.webp`;
  return (
    <Image
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      priority={priority}
      className={className ? `art3d ${className}` : 'art3d'}
    />
  );
}

/** The desk's wordmark lockup; the tagline names this surface instead of the owner product. */
export function BrandWordmark({ height = 26, tagline }: { height?: number; tagline?: string }) {
  const width = Math.round(height * 3.2);
  const image = (
    <>
      <Image
        src="/brand/omnichat-wordmark-light.webp"
        width={width}
        height={height}
        alt="OmniChat"
        priority
        className="brand-wordmark"
      />
      <Image
        src="/brand/omnichat-wordmark-on-dark.webp"
        width={width}
        height={height}
        alt=""
        aria-hidden="true"
        className="brand-wordmark brand-wordmark-on-dark"
      />
    </>
  );
  if (!tagline) return image;
  return (
    <span className="brand-lockup" style={{ '--wm-h': `${height}px` } as CSSProperties}>
      {image}
      <span className="brand-tagline">{tagline}</span>
    </span>
  );
}

export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/omnichat-mark.webp"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className ? `brand-mark ${className}` : 'brand-mark'}
    />
  );
}
