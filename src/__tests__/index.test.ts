import * as path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('electron-native-share', () => {
  describe('canShare', () => {
    it('returns a boolean', async () => {
      const { canShare } = await import('../index');
      const result = canShare();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('share validation - rejections', () => {
    it('throws when no content is provided', async () => {
      const { share } = await import('../index');
      await expect(share({})).rejects.toThrow(
        'At least one of text, url, title, or files must be provided',
      );
    });

    it('accepts empty files array as no content', async () => {
      const { share } = await import('../index');
      await expect(share({ files: [] })).rejects.toThrow(
        'At least one of text, url, title, or files must be provided',
      );
    });

    it('rejects file:// URLs', async () => {
      const { share } = await import('../index');
      await expect(share({ url: 'file:///etc/passwd' })).rejects.toThrow(
        'Unsupported URL protocol',
      );
    });

    it('rejects javascript: URLs', async () => {
      const { share } = await import('../index');
      await expect(share({ url: 'javascript:alert(1)' })).rejects.toThrow(
        'Unsupported URL protocol',
      );
    });

    it('rejects ftp: URLs', async () => {
      const { share } = await import('../index');
      await expect(share({ url: 'ftp://example.com/file' })).rejects.toThrow(
        'Unsupported URL protocol',
      );
    });

    it('rejects malformed URLs', async () => {
      const { share } = await import('../index');
      await expect(share({ url: 'not a valid url' })).rejects.toThrow(
        'Invalid URL',
      );
    });

    it('rejects relative file paths', async () => {
      const { share } = await import('../index');
      await expect(share({ files: ['relative/path.txt'] })).rejects.toThrow(
        'File paths must be absolute',
      );
    });

    it('rejects mixed absolute and relative file paths', async () => {
      const { share } = await import('../index');
      const existingFile = path.resolve(process.cwd(), 'package.json');
      await expect(share({ files: [existingFile, 'relative.txt'] })).rejects.toThrow(
        'File paths must be absolute',
      );
    });

    it('rejects non-existent file paths', async () => {
      const { share } = await import('../index');
      await expect(share({ files: ['/nonexistent/path/file.txt'] })).rejects.toThrow(
        'File not found: /nonexistent/path/file.txt',
      );
    });
  });

  describe('share validation - acceptance', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.doUnmock('../platform');
      vi.restoreAllMocks();
      vi.resetModules();
    });

    it('throws when native addon is not available (http URL)', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      await expect(share({ url: 'http://example.com' })).rejects.toThrow(
        'Native sharing is not available on this platform',
      );
    });

    it('throws when native addon is not available (https URL)', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      await expect(share({ url: 'https://example.com/path?q=1' })).rejects.toThrow(
        'Native sharing is not available on this platform',
      );
    });

    it('throws when native addon is not available (files)', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const existingFile = path.resolve(process.cwd(), 'package.json');
      await expect(share({ files: [existingFile] })).rejects.toThrow(
        'Native sharing is not available on this platform',
      );
    });

    it('throws when native addon is not available (text)', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      await expect(share({ text: 'hello world' })).rejects.toThrow(
        'Native sharing is not available on this platform',
      );
    });

    it('throws when native addon is not available (title)', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      await expect(share({ title: 'My Title' })).rejects.toThrow(
        'Native sharing is not available on this platform',
      );
    });

    it('propagates native addon errors', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => ({
          canShare: () => true,
          share: () => Promise.reject(new Error('native error')),
        }),
        isNativeSupported: () => true,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      await expect(share({ text: 'hello' })).rejects.toThrow('native error');
    });

    it('returns cancelled on user cancellation', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => ({
          canShare: () => true,
          share: () => Promise.reject(new Error('Share cancelled by user')),
        }),
        isNativeSupported: () => true,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ text: 'hello' });
      expect(result).toEqual({ method: 'cancelled' });
    });
  });

  describe('platform', () => {
    it('detects platform support', async () => {
      const { isNativeSupported, getPlatform } = await import('../platform');
      const platform = getPlatform();
      const supported = isNativeSupported();

      if (platform === 'darwin' || platform === 'win32') {
        expect(supported).toBe(true);
      } else {
        expect(supported).toBe(false);
      }
    });

    it('loads native addon on supported platforms', async () => {
      const { loadNativeAddon, isNativeSupported } = await import('../platform');

      if (!isNativeSupported()) return;

      const addon = loadNativeAddon();
      if (addon === null) return; // native build unavailable in this environment

      expect(addon.canShare).toBeInstanceOf(Function);
      expect(addon.share).toBeInstanceOf(Function);
    });
  });

  describe('getNativeWindowHandle', () => {
    it('returns undefined for null', async () => {
      const { getNativeWindowHandle } = await import('../platform');
      expect(getNativeWindowHandle(null)).toBeUndefined();
    });

    it('returns undefined for undefined', async () => {
      const { getNativeWindowHandle } = await import('../platform');
      expect(getNativeWindowHandle(undefined)).toBeUndefined();
    });

    it('returns undefined for objects without getNativeWindowHandle', async () => {
      const { getNativeWindowHandle } = await import('../platform');
      expect(getNativeWindowHandle({})).toBeUndefined();
      expect(getNativeWindowHandle({ other: 'prop' })).toBeUndefined();
    });

    it('returns undefined when getNativeWindowHandle is not a function', async () => {
      const { getNativeWindowHandle } = await import('../platform');
      expect(getNativeWindowHandle({ getNativeWindowHandle: 'not a fn' })).toBeUndefined();
    });

    it('returns the buffer from a valid BrowserWindow mock', async () => {
      const { getNativeWindowHandle } = await import('../platform');
      const mockHandle = Buffer.alloc(8);
      const mockWindow = { getNativeWindowHandle: () => mockHandle };
      expect(getNativeWindowHandle(mockWindow)).toBe(mockHandle);
    });
  });

  describe('native addon smoke tests', () => {
    it('canShare returns a boolean value on supported platforms', async () => {
      const { loadNativeAddon, isNativeSupported } = await import('../platform');
      if (!isNativeSupported()) return;

      const addon = loadNativeAddon();
      if (addon === null) return;

      const result = addon.canShare();
      expect(typeof result).toBe('boolean');
    });
  });
});
