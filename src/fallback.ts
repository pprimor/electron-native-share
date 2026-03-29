import type { ShareOptions, ShareResult } from './types';
import type { StdioOptions } from 'child_process';
import { execSync } from 'child_process';
import { getElectronClipboard } from './electron-clipboard';

export async function shareFallback(options: ShareOptions): Promise<ShareResult> {
  const textParts: string[] = [];

  if (options.title) textParts.push(options.title);
  if (options.text) textParts.push(options.text);
  if (options.url) textParts.push(options.url);

  const content = textParts.join('\n');

  if (!content && (!options.files || options.files.length === 0)) {
    return { native: false, method: 'none' };
  }

  const clipText = content || options.files!.join('\n');

  try {
    const clipboard = getElectronClipboard();
    if (clipboard) {
      clipboard.writeText(clipText);
      return { native: false, method: 'clipboard' };
    }
  } catch {
    // electron clipboard failed
  }

  try {
    copyToClipboardViaProcess(clipText);
    return { native: false, method: 'clipboard' };
  } catch {
    // all clipboard methods failed
  }

  return { native: false, method: 'none' };
}

function copyToClipboardViaProcess(text: string): void {
  const platform = process.platform;
  const pipeStdio: StdioOptions = ['pipe', 'ignore', 'ignore'];

  if (platform === 'linux') {
    try {
      execSync('which xclip', { stdio: 'ignore' });
      execSync('xclip -selection clipboard', { input: text, stdio: pipeStdio });
      return;
    } catch {
      // xclip not available, try xsel
    }
    execSync('xsel --clipboard --input', { input: text, stdio: pipeStdio });
  } else if (platform === 'darwin') {
    execSync('pbcopy', { input: text, stdio: pipeStdio });
  } else {
    throw new Error('No clipboard method available');
  }
}
