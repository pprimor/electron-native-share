import * as path from 'path';
import type { NativeAddon } from './types';

let cachedAddon: NativeAddon | null | undefined;

export function getPlatform(): NodeJS.Platform {
  return process.platform;
}

export function isNativeSupported(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32';
}

export function loadNativeAddon(): NativeAddon | null {
  if (cachedAddon !== undefined) {
    return cachedAddon;
  }

  if (!isNativeSupported()) {
    cachedAddon = null;
    return null;
  }

  try {
    // Try prebuild first (installed via node-gyp-build)
    const gypBuild = require('node-gyp-build');
    const addon = gypBuild(path.resolve(__dirname, '..'));
    cachedAddon = addon as NativeAddon;
    return cachedAddon;
  } catch {
    // prebuild not found, try local build directory
  }

  try {
    const addon = require('../build/Release/native_share.node');
    cachedAddon = addon as NativeAddon;
    return cachedAddon;
  } catch {
    // local build not found either
  }

  cachedAddon = null;
  return null;
}

export function getNativeWindowHandle(browserWindow: any): Buffer | undefined {
  if (!browserWindow || typeof browserWindow.getNativeWindowHandle !== 'function') {
    return undefined;
  }
  return browserWindow.getNativeWindowHandle();
}
