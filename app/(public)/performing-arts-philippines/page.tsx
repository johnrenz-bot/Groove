import type { Metadata } from 'next';
import { PublicLayout } from '@/components/shared/PublicLayout';
import { PerformingArtsHub } from '@/features/performing-arts/components/PerformingArtsHub';
import { CONTENT_LAST_VERIFIED } from '@/features/performing-arts/data/content';

/**
 * Section links for the public header.
 *
 * The default PublicLayout menu points at home-page anchors (#talent, #studio,
 * #about, #services) that do not exist on this route, so the header advertised
 * four dead links. These point at the sections that are actually on the page.
 */
const NAV_LINKS = [
  { label: 'Featured', href: '/performing-arts-philippines#featured' },
  { label: 'Categories', href: '/performing-arts-philippines#categories' },
  { label: 'Organizations', href: '/performing-arts-philippines#organizations' },
  { label: 'Events', href: '/performing-arts-philippines#events' },
  { label: 'Search', href: '/performing-arts-philippines#explore' },
];

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PAGE_PATH = '/performing-arts-philippines';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

const PAGE_TITLE = 'Filipino Performing Arts Philippines | Culture, Dance, Music & Theater';

const PAGE_DESCRIPTION =
  'Explore Filipino performing arts, including traditional and contemporary dance, music, theater, cultural heritage, artists, festivals, organizations, educational resources, and industry news.';

/**
 * Structured data for the public entry point.
 *
 * Breadcrumb + CollectionPage only, and derived from the same dataset the page
 * renders, so it can never describe content that is not on screen.
 */
function buildStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Filipino Performing Arts Philippines',
            item: PAGE_URL,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: 'Filipino Performing Arts Philippines',
        description: PAGE_DESCRIPTION,
        url: PAGE_URL,
        inLanguage: 'en-PH',
        dateModified: CONTENT_LAST_VERIFIED,
      },
    ],
  };
}

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'Groove',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: 'en_PH',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/**
 * The public entry point to the performing-arts hub.
 *
 * Renders the SAME <PerformingArtsHub> as /client/… and /coach/…, in the public
 * shell rather than a portal header. One component for all three routes is the
 * point: the editorial layout, the images, the alt text and the dataset cannot
 * drift between the public page and the two portals, because there is only one
 * copy of each. The role passed in only changes which Groove links are offered.
 */
export default function PerformingArtsPhilippinesPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData()) }}
      />
      <PerformingArtsHub role="public" />
    </PublicLayout>
  );
}