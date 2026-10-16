import { sectionsForRole } from '@/components/header/navConfig';

/**
 * TEMPORARY visual-verification harness for the shared header. Not part of the
 * app; deleted after checking the header at 375 / 768 / 1280 in a real browser,
 * in both themes.
 *
 * It used to render `AppTopNav` three times, once per role's real menu. That
 * component is gone — there is now one `<SiteHeader>`, and it takes its role
 * from the session rather than from a prop. To still be able to check every
 * role's menu without signing in as each of them, this renders the same
 * `sectionsForRole(role)` lookup the header performs and prints it, which is the
 * only part of the header that varies by role.
 *
 * The bar's geometry lives in `globals.css` (`.hx-header*`) and is shared
 * literally, so checking it on any one role checks it on all of them.
 */
const ROLES = ['admin', 'coach', 'client', 'guest'] as const;

export default function VerifyHeaderPage() {
  return (
    <div className="min-h-screen bg-background p-6 font-sans text-foreground">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-lg font-semibold">Header contract — nav per role</h1>
        <ul className="flex flex-col gap-4">
          {ROLES.map((role) => (
            <li key={role} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold uppercase tracking-wider">{role}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sectionsForRole(role)
                  .map((section) =>
                    section.items
                      ? `${section.label} (${section.items.length})`
                      : section.label
                  )
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
        <div className="hx-header mt-6 border border-border">
          <div className="hx-header-inner">
            <div className="hx-header-brand">
              <span className="hx-logo-name">Groove</span>
            </div>
            <nav className="hx-header-nav" aria-label="Main">
              <span className="hx-link hx-link--anchor" data-active="true">
                Dashboard
              </span>
              <span className="hx-link">Community</span>
              <span className="hx-link">About Groove</span>
            </nav>
            <div className="hx-header-actions">
              <span className="hx-auth-link hx-auth-link--primary">Get started</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}