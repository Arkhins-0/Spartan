import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkerProvider, {
  canRegisterServiceWorker,
  registerServiceWorker,
  unregisterServiceWorkers,
} from '@/components/providers/ServiceWorkerProvider';

const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');
const originalCachesDescriptor = Object.getOwnPropertyDescriptor(window, 'caches');

function mockServiceWorker(
  register = vi.fn().mockResolvedValue({ scope: '/' }),
  getRegistrations = vi.fn().mockResolvedValue([]),
) {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: { register, getRegistrations },
  });

  return { register, getRegistrations };
}

function mockCaches(keys: string[] = []) {
  const del = vi.fn().mockResolvedValue(true);
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: { keys: vi.fn().mockResolvedValue(keys), delete: del },
  });
  return del;
}

/**
 * The provider reads NODE_ENV, which vitest sets to "test". Each block states
 * which environment it is exercising rather than relying on the ambient value.
 */
function setNodeEnv(value: string) {
  vi.stubEnv('NODE_ENV', value);
}

describe('ServiceWorkerProvider', () => {
  beforeEach(() => {
    setNodeEnv('production');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();

    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(window.navigator, 'serviceWorker', originalServiceWorkerDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator, 'serviceWorker');
    }

    if (originalCachesDescriptor) {
      Object.defineProperty(window, 'caches', originalCachesDescriptor);
    } else {
      Reflect.deleteProperty(window as unknown as Record<string, unknown>, 'caches');
    }
  });

  it('registers the root service worker on supported origins', async () => {
    const { register } = mockServiceWorker();

    await registerServiceWorker();

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('does not register when service workers are unsupported', async () => {
    Reflect.deleteProperty(window.navigator, 'serviceWorker');

    expect(canRegisterServiceWorker()).toBe(false);
    await expect(registerServiceWorker()).resolves.toBeNull();
  });

  it('registers after the window load event when the provider mounts early', async () => {
    const { register } = mockServiceWorker();
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

    render(<ServiceWorkerProvider />);
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });

    readyState.mockRestore();
  });

  describe('in development', () => {
    beforeEach(() => {
      setNodeEnv('development');
    });

    it('never registers, because the worker serves /_next/static/ cache-first', async () => {
      const { register } = mockServiceWorker();

      expect(canRegisterServiceWorker()).toBe(false);
      await expect(registerServiceWorker()).resolves.toBeNull();
      expect(register).not.toHaveBeenCalled();
    });

    it('tears down a worker an earlier production build installed', async () => {
      const unregister = vi.fn().mockResolvedValue(true);
      const { register, getRegistrations } = mockServiceWorker(
        vi.fn(),
        vi.fn().mockResolvedValue([{ unregister }]),
      );
      mockCaches();

      render(<ServiceWorkerProvider />);

      // Declining to register is not enough: an installed worker stays in
      // control of the page and keeps answering with stale chunk hashes.
      await waitFor(() => {
        expect(getRegistrations).toHaveBeenCalled();
        expect(unregister).toHaveBeenCalled();
      });
      expect(register).not.toHaveBeenCalled();
    });

    it('drops the caches the worker owns and leaves other caches alone', async () => {
      mockServiceWorker(vi.fn(), vi.fn().mockResolvedValue([]));
      const del = mockCaches([
        'spartan-landing-cache-v1.1.0-static',
        'spartan-performance-metrics',
        'some-other-app-cache',
      ]);

      await unregisterServiceWorkers();

      // The cached /_next/static/ chunks are what actually break the page, and
      // they outlive the registration.
      expect(del).toHaveBeenCalledWith('spartan-landing-cache-v1.1.0-static');
      expect(del).toHaveBeenCalledWith('spartan-performance-metrics');
      expect(del).not.toHaveBeenCalledWith('some-other-app-cache');
    });

    it('survives a browser that refuses the cache API', async () => {
      mockServiceWorker(vi.fn(), vi.fn().mockResolvedValue([]));
      Object.defineProperty(window, 'caches', {
        configurable: true,
        value: {
          keys: vi.fn().mockRejectedValue(new Error('denied')),
          delete: vi.fn(),
        },
      });

      await expect(unregisterServiceWorkers()).resolves.toBe(false);
    });
  });
});
