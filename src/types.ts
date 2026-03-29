export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  /** Array of absolute file paths to share */
  files?: string[];
}

export interface ShareResult {
  /** Whether native sharing was used (false = fallback) */
  native: boolean;
  /** The method used: 'native' | 'clipboard' | 'none' */
  method: 'native' | 'clipboard' | 'none';
}

export interface NativeAddon {
  share(options: NativeShareInput): Promise<void>;
  canShare(): boolean;
}

export interface NativeShareInput {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
  /** Native window handle (pointer as Buffer) for Windows */
  windowHandle?: Buffer;
}
