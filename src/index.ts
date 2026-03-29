import * as fs from 'fs';
import * as path from 'path';
import type { ShareOptions, ShareResult, NativeShareInput } from './types';
import { loadNativeAddon, isNativeSupported, getNativeWindowHandle } from './platform';
import { shareFallback } from './fallback';

export type { ShareOptions, ShareResult } from './types';

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

export function canShare(): boolean {
  if (!isNativeSupported()) return false;
  const addon = loadNativeAddon();
  return addon !== null && addon.canShare();
}

function validateOptions(options: ShareOptions): void {
  if (!options.text && !options.url && !options.title && (!options.files || options.files.length === 0)) {
    throw new Error('At least one of text, url, title, or files must be provided');
  }

  if (options.url) {
    let parsed: URL;
    try {
      parsed = new URL(options.url);
    } catch {
      throw new Error(`Invalid URL: ${options.url}`);
    }
    if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsed.protocol} (only http and https are allowed)`);
    }
  }

  if (options.files) {
    for (const filePath of options.files) {
      if (!path.isAbsolute(filePath)) {
        throw new Error(`File paths must be absolute: ${filePath}`);
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    }
  }
}

export async function share(
  options: ShareOptions,
  browserWindow?: any,
): Promise<ShareResult> {
  validateOptions(options);

  const addon = loadNativeAddon();
  if (!addon || !addon.canShare()) {
    return shareFallback(options);
  }

  const input: NativeShareInput = {
    title: options.title,
    text: options.text,
    url: options.url,
    files: options.files,
  };

  if (browserWindow) {
    input.windowHandle = getNativeWindowHandle(browserWindow);
  }

  try {
    await addon.share(input);
    return { native: true, method: 'native' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Share cancelled by user') {
      return { native: true, method: 'none' };
    }
    return shareFallback(options);
  }
}

export { getNativeWindowHandle } from './platform';
