import {
  dashboardLanguage,
  translateAdminGroup,
  translateAdminLabel,
  translateIn,
} from '@/lib/i18n/LanguageProvider';
import { navDictionaries, type Language } from '@/lib/i18n/dictionaries';

import type { HeaderAvatarItem, HeaderDropdownItem, HeaderQuickLink } from './appHeaderConfig';
import type { NavRole } from './navConfig';

/**
 * Text resolution for the shared header.
 *
 * The desktop bar, the drawer and the account menu all render the SAME data
 * from `appHeaderConfig`, so the dictionary lookup belongs in one place too.
 * Putting it here rather than repeating `translateIn` at four call sites is what
 * keeps a Tagalog session from showing translated triggers above untranslated
 * items — the state this replaces.
 *
 * Guest pages stay English by construction: `dashboardLanguage` returns `en`
 * for role `guest`, exactly as it does for the rest of the chrome.
 */

function langFor(role: NavRole, language: Language): Language {
  return dashboardLanguage(role, language);
}

function tFor(language: Language) {
  return (key: string, fallback?: string) => translateIn(language, key, fallback);
}

/** Top-level trigger label: Dashboard / Community / About Groove. */
export function translateSectionLabel(
  role: NavRole,
  language: Language,
  id: string,
  fallback: string
): string {
  const lang = langFor(role, language);
  return translateIn(lang, `nav.${id}`, fallback);
}

/** A row inside a dropdown, including its description and group heading. */
export function translateDropdownItem(
  role: NavRole,
  language: Language,
  item: HeaderDropdownItem
): { label: string; description?: string } {
  const lang = langFor(role, language);
  if (lang === 'en') return { label: item.label, description: item.description };

  if (role === 'admin') {
    // Admin rows are keyed by route in `LanguageProvider` because the console
    // model carries hrefs rather than stable leaf ids.
    return {
      label: translateAdminLabel(tFor(lang), item.href, item.label),
      description: item.description,
    };
  }

  const entry = navDictionaries[lang]?.[item.id];
  const label =
    (role === 'client' ? entry?.label_client : entry?.label_coach) ??
    entry?.label ??
    item.label;
  const description =
    (role === 'client' ? entry?.description_client : entry?.description_coach) ??
    entry?.description ??
    item.description;
  return { label, description };
}

/** Small-caps heading above a run of dropdown rows. */
export function translateGroup(
  role: NavRole,
  language: Language,
  group: string | undefined
): string | undefined {
  if (!group) return group;
  const lang = langFor(role, language);
  if (lang === 'en') return group;

  if (role === 'admin') return translateAdminGroup(tFor(lang), group);

  if (group === 'Performing Arts') return translateIn(lang, 'nav.communityHeading', group);
  if (group === 'Dashboard') return translateIn(lang, 'nav.dashboard', group);
  if (group === 'Pages') return translateIn(lang, 'palette.pages', group);
  if (group === 'Account') return translateIn(lang, 'header.accountTitle', group);
  return group;
}

const ACCOUNT_KEYS: Record<string, string> = {
  profile: 'header.profile',
  settings: 'header.accountSettings',
  preferences: 'header.preferences',
  help: 'header.helpFaq',
  billing: 'header.billing',
};

/** Account-panel destination label, keyed by the stable item id. */
export function translateAccountItem(
  role: NavRole,
  language: Language,
  item: HeaderAvatarItem
): string {
  const lang = langFor(role, language);
  const key = ACCOUNT_KEYS[item.id];
  return key ? translateIn(lang, key, item.label) : item.label;
}

/**
 * Palette row. Quick links are flattened from the same two menus, and their
 * ids preserve the source id after a `quick-` prefix, so the same dictionaries
 * apply without a second lookup table.
 */
export function translateQuickLink(
  role: NavRole,
  language: Language,
  link: HeaderQuickLink
): { label: string; description?: string; group?: string } {
  const lang = langFor(role, language);
  if (lang === 'en') {
    return { label: link.label, description: link.description, group: link.group };
  }

  const base = link.id.replace(/^quick-/, '');
  const group = translateGroup(role, language, link.group);

  if (role === 'admin' && link.href.startsWith('/admin')) {
    return {
      label: translateAdminLabel(tFor(lang), link.href, link.label),
      description: link.description,
      group,
    };
  }

  const accountKey = ACCOUNT_KEYS[base];
  if (accountKey) {
    return { label: translateIn(lang, accountKey, link.label), description: link.description, group };
  }

  const entry = navDictionaries[lang]?.[base];
  const label =
    (role === 'client' ? entry?.label_client : entry?.label_coach) ??
    entry?.label ??
    link.label;
  const description =
    (role === 'client' ? entry?.description_client : entry?.description_coach) ??
    entry?.description ??
    link.description;
  return { label, description, group };
}
