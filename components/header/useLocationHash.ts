import { useSyncExternalStore } from 'react';

/**
 * The current URL fragment, as a subscription rather than a render-time read.
 *
 * `usePathname` deliberately omits the hash, so two links that differ only by
 * `#showcase` / `#directory` are indistinguishable from it. That is why both
 * used to render as current at once. This hook gives the active-route matcher
 * the missing half without reading `window` during render (which would be a
 * hydration mismatch).
 */
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function getSnapshot() {
  return window.location.hash;
}

function getServerSnapshot() {
  return '';
}

export function useLocationHash(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useLocationHash;
