'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_PATH = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';

/**
 * Cache names the worker owns, from CACHE_CLEANUP_PREFIXES in public/sw.js.
 * Only these are deleted, so an unrelated cache on the same origin survives.
 */
const OWNED_CACHE_PREFIXES = ['spartan-landing-cache', 'spartan-performance'];

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function supportsServiceWorker() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * The worker serves `/_next/static/` cache-first (public/sw.js), which is
 * correct in production and actively harmful in development: after a dev server
 * restart the browser keeps being handed the previous build's chunk hashes, and
 * the page dies with "the module factory is not available". A hard reload does
 * not reliably fix it, because an active worker's fetch handler still answers.
 *
 * So development does not get a worker at all.
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

export function canRegisterServiceWorker() {
  if (!supportsServiceWorker()) {
    return false;
  }

  if (isDevelopment()) {
    return false;
  }

  return window.location.protocol === 'https:' || isLocalhost(window.location.hostname);
}

export async function registerServiceWorker() {
  if (!canRegisterServiceWorker()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      scope: SERVICE_WORKER_SCOPE,
    });
  } catch (error) {
    console.warn('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Remove any worker this origin already installed, and drop the caches it owns.
 *
 * Declining to register is not enough on its own: a worker installed by an
 * earlier build stays installed and stays in control of the page. Anyone who
 * loaded the app before this guard existed still has one, so it has to be taken
 * out actively rather than merely not renewed.
 */
export async function unregisterServiceWorkers() {
  if (!supportsServiceWorker()) {
    return false;
  }

  let removed = false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (await registration.unregister()) {
        removed = true;
      }
    }
  } catch (error) {
    console.warn('Service worker unregistration failed:', error);
  }

  // The registration going away does not empty its caches, and it is the
  // cached `/_next/static/` chunks that break the page.
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => OWNED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key)),
      );
    }
  } catch (error) {
    console.warn('Service worker cache cleanup failed:', error);
  }

  return removed;
}

export default function ServiceWorkerProvider() {
  useEffect(() => {
    if (!supportsServiceWorker()) {
      return;
    }

    // In development the job is the opposite of registering: tear down whatever
    // a previous production-like session left behind. Done on mount rather than
    // on load — the sooner the stale worker loses control, the fewer broken
    // chunk requests it answers.
    if (isDevelopment()) {
      void unregisterServiceWorkers().then((removed) => {
        if (removed) {
          console.info(
            'Removed a stale service worker left over from a production build. Reload once to pick up fresh chunks.',
          );
        }
      });
      return;
    }

    if (!canRegisterServiceWorker()) {
      return;
    }

    const handleLoad = () => {
      void registerServiceWorker();
    };

    if (document.readyState === 'complete') {
      handleLoad();
      return;
    }

    window.addEventListener('load', handleLoad, { once: true });

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return null;
}
