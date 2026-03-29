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

    it('accepts http URLs', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ url: 'http://example.com' });
      expect(result.native).toBe(false);
      expect(['clipboard', 'none']).toContain(result.method);
    });

    it('accepts https URLs', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ url: 'https://example.com/path?q=1' });
      expect(result.native).toBe(false);
      expect(['clipboard', 'none']).toContain(result.method);
    });

    it('accepts absolute file paths', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const existingFile = path.resolve(process.cwd(), 'package.json');
      const result = await share({ files: [existingFile] });
      expect(result.native).toBe(false);
    });

    it('accepts text content', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ text: 'hello world' });
      expect(result.native).toBe(false);
    });

    it('accepts title-only content', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => null,
        isNativeSupported: () => false,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ title: 'My Title' });
      expect(result.native).toBe(false);
    });

    it('falls back when native addon throws', async () => {
      vi.doMock('../platform', () => ({
        loadNativeAddon: () => ({
          canShare: () => true,
          share: () => Promise.reject(new Error('native error')),
        }),
        isNativeSupported: () => true,
        getNativeWindowHandle: () => undefined,
      }));
      const { share } = await import('../index');
      const result = await share({ text: 'hello' });
      expect(result.native).toBe(false);
    });

    it('returns native:true method:none on user cancellation', async () => {
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
      expect(result).toEqual({ native: true, method: 'none' });
    });
  });

  describe('fallback', () => {
    it('returns clipboard result when no native addon', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result.native).toBe(false);
      expect(['clipboard', 'none']).toContain(result.method);
    });

    it('returns none when nothing to share', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({});
      expect(result).toEqual({ native: false, method: 'none' });
    });

    it('handles title, text, and url together', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({
        title: 'Title',
        text: 'Body text',
        url: 'https://example.com',
      });
      expect(result.native).toBe(false);
      expect(['clipboard', 'none']).toContain(result.method);
    });

    it('handles files-only content', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ files: ['/tmp/test.txt'] });
      expect(result.native).toBe(false);
      expect(['clipboard', 'none']).toContain(result.method);
    });

    it('returns none for empty files array with no text', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ files: [] });
      expect(result).toEqual({ native: false, method: 'none' });
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
