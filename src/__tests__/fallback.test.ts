import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockWriteText = vi.fn();
const mockExecSync = vi.fn();

vi.mock('../electron-clipboard', () => ({
  getElectronClipboard: vi.fn(() => ({
    writeText: mockWriteText,
  })),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

describe('fallback clipboard methods', () => {
  beforeEach(() => {
    vi.resetModules();
    mockWriteText.mockReset();
    mockExecSync.mockReset();
  });

  describe('electron clipboard path', () => {
    it('uses electron clipboard when available', async () => {
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result).toEqual({ native: false, method: 'clipboard' });
      expect(mockWriteText).toHaveBeenCalledWith('hello');
    });

    it('combines title, text, and url for clipboard', async () => {
      const { shareFallback } = await import('../fallback');
      await shareFallback({ title: 'T', text: 'Body', url: 'https://x.com' });
      expect(mockWriteText).toHaveBeenCalledWith('T\nBody\nhttps://x.com');
    });

    it('copies file paths when no text content', async () => {
      const { shareFallback } = await import('../fallback');
      await shareFallback({ files: ['/tmp/a.txt', '/tmp/b.txt'] });
      expect(mockWriteText).toHaveBeenCalledWith('/tmp/a.txt\n/tmp/b.txt');
    });
  });

  describe('process clipboard path', () => {
    const originalPlatform = process.platform;

    beforeEach(async () => {
      const { getElectronClipboard } = await import('../electron-clipboard');
      vi.mocked(getElectronClipboard).mockReturnValue(null);
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('falls back to xclip on linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result).toEqual({ native: false, method: 'clipboard' });
      expect(mockExecSync).toHaveBeenCalledWith('which xclip', { stdio: 'ignore' });
      expect(mockExecSync).toHaveBeenCalledWith('xclip -selection clipboard', {
        input: 'hello',
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    });

    it('falls back to xsel when xclip is unavailable on linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'which xclip') throw new Error('not found');
      });
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result).toEqual({ native: false, method: 'clipboard' });
      expect(mockExecSync).toHaveBeenCalledWith('xsel --clipboard --input', {
        input: 'hello',
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    });

    it('falls back to pbcopy on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result).toEqual({ native: false, method: 'clipboard' });
      expect(mockExecSync).toHaveBeenCalledWith('pbcopy', {
        input: 'hello',
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    });

    it('returns none when all clipboard methods fail', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      mockExecSync.mockImplementation(() => { throw new Error('no clipboard'); });
      const { shareFallback } = await import('../fallback');
      const result = await shareFallback({ text: 'hello' });
      expect(result).toEqual({ native: false, method: 'none' });
    });
  });
});
