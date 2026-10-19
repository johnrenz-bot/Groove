import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { FaqBrowser } from '@/components/faq/FaqBrowser';
import { ALL_FAQS, FAQ_CATEGORIES } from '@/lib/faq/faq-data';

/**
 * /faq — the full frequently-asked-questions page.
 *
 * WHY A SERVER COMPONENT
 *   The answers are static content and the only interactive part is the
 *   browser below, which is a client component in its own right. Rendering the
 *   shell here keeps the first paint as plain HTML — the category list and the
 *   question count are on screen before any JavaScript runs, and the page is
 *   readable with scripting off even though search and the accordion need it.
 *
 * ACCESSIBILITY
 *   One `h1`. The categories are real headings in document order, and the
 *   browser's own "Filter by category" heading is visually hidden rather than
 *   omitted, so the filter is named without adding a line of type to the design.
 *
 * IT IS PUBLIC
 *   It sits in the `(public)` group, so it inherits the shared header and
 *   footer and is reachable while signed out — an FAQ that asks you to log in
 *   before you can read it cannot answer the question people arrive with.
 */
export default function FaqPage() {
  return (
    <PublicLayout>
      <div className="faq-page">
        {/* Page header */}
        <header className="faq-hero">
          <span className="g-eyebrow">Help Centre</span>
          <h1 className="g-display">Frequently Asked Questions</h1>
          <p className="faq-hero-lead">
            Everything Groove System actually does, written down — how accounts work, what
            each role can reach, and how to get unstuck. {ALL_FAQS.length} answers across{' '}
            {FAQ_CATEGORIES.length} categories.
          </p>

          {/* Jump straight to a category. Anchor links, not buttons: they work
              before hydration and can be shared or bookmarked. */}
          <nav aria-label="FAQ categories" className="faq-hero-cats">
            {FAQ_CATEGORIES.map((category) => (
              <a key={category.id} href={`#${category.id}`} className="faq-hero-cat">
                <span className="faq-hero-cat-label">{category.label}</span>
                <span className="faq-hero-cat-count">{category.items.length}</span>
              </a>
            ))}
          </nav>
        </header>

        {/* Search + filters + accordion.

            The <Suspense> is required, not decorative: the browser reads `?q=`
            through useSearchParams so the category directory can deep-link
            straight to a question. The fallback keeps the page's structure — it
            renders the same search bar and the real count — so a slow connection
            shows a usable shell instead of a blank column. */}
        <Suspense
          fallback={
            <div className="faq-searchbar" role="search" aria-busy="true">
              <span className="faq-search-placeholder">Loading questions…</span>
            </div>
          }
        >
          <FaqBrowser />
        </Suspense>

        {/* Category directory. Each heading owns the entries below it, so the
            page has a usable outline even with search untouched. */}
        <section aria-label="All categories" className="faq-directory">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.id} id={category.id} className="faq-directory-group">
              <h2 className="faq-directory-heading">
                {category.label}
                <span className="faq-directory-count">{category.items.length}</span>
              </h2>
              <p className="faq-directory-blurb">{category.blurb}</p>
              <ul className="faq-directory-list">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/faq?q=${encodeURIComponent(item.question)}`}
                      className="faq-directory-link"
                    >
                      <span>{item.question}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Still stuck? Point at the two places an answer can actually come from. */}
        <aside className="faq-help">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Still need a hand?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Every account can reach the Groove team using the contact details in the
              footer of this page, and signed-in members can raise a support request through
              Inquiries, where it is tracked rather than lost in an inbox.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="mailto:grooveyyph@gmail.com" className="faq-btn faq-btn--primary">
              Email the team
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href="/register/client" className="faq-btn">
              Create an account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}
