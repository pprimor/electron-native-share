import type { ShareOptions, ShareResult } from './types';

export async function shareFallback(options: ShareOptions): Promise<ShareResult> {
  const textParts: string[] = [];

  if (options.title) textParts.push(options.title);
  if (options.text) textParts.push(options.text);
  if (options.url) textParts.push(options.url);

  const content = textParts.join('\n');

  if (!content && (!options.files || options.files.length === 0)) {
    return { native: false, method: 'none' };
  }

  try {
    const { clipboard } = require('electron');
    clipboard.writeText(content || options.files!.join('\n'));
    return { native: false, method: 'clipboard' };
  } catch {
    // electron not available — try Node.js clipboard fallback
  }

  try {
    await copyToClipboardViaProcess(content || options.files!.join('\n'));
    return { native: false, method: 'clipboard' };
  } catch {
    // all clipboard methods failed
  }

  return { native: false, method: 'none' };
}

async function copyToClipboardViaProcess(text: string): Promise<void> {
  const { execSync } = require('child_process');
  const platform = process.platform;
  const pipeStdio: [string, string, string] = ['pipe', 'ignore', 'ignore'];

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
