/**
 * Singleton loader for the YouTube IFrame Player API.
 *
 * - No-op during SSR (`typeof window === 'undefined'`).
 * - Loads `https://www.youtube.com/iframe_api` exactly once by injecting one
 *   <script> tag and resolving a shared promise when `onYouTubeIframeAPIReady`
 *   fires.
 * - Returns the same promise to every caller, so no matter how many mounts
 *   request the player, only one script is ever fetched.
 */

const API_URL = 'https://www.youtube.com/iframe_api';
const SCRIPT_ID = 'groove-yt-iframe-api';

let loadPromise: Promise<typeof window.YT> | null = null;

function waitForReady(): Promise<typeof window.YT> {
  return new Promise((resolve) => {
    const done = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return true;
      }
      return false;
    };

    if (done()) return;

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        /* previous callbacks must not break the loader chain */
      }
      done();
    };
  });
}

export function loadYouTubeIframeAPI(): Promise<typeof window.YT> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API is only available in the browser'));
  }

  if (loadPromise) return loadPromise;

  if (window.YT?.Player) {
    loadPromise = Promise.resolve(window.YT);
    return loadPromise;
  }

  loadPromise = new Promise<typeof window.YT>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('YouTube IFrame API did not load in time'));
    }, 10_000);

    const finish = (yt: typeof window.YT) => {
      window.clearTimeout(timeout);
      resolve(yt);
    };

    // The API exposes itself via window.onYouTubeIframeAPIReady.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        /* ignore */
      }
      finish(window.YT);
    };

    if (document.getElementById(SCRIPT_ID)) {
      // Another mount is already loading it; wait for the global callback.
      waitForReady().then(finish, reject);
      return;
    }

    const tag = document.createElement('script');
    tag.id = SCRIPT_ID;
    tag.src = API_URL;
    tag.async = true;
    tag.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Failed to fetch the YouTube IFrame API (check CSP script-src)'));
    };
    document.head.appendChild(tag);
  });

  return loadPromise;
}
