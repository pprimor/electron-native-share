export function getElectronClipboard(): { writeText(text: string): void } | null {
  try {
    return require('electron').clipboard;
  } catch {
    return null;
  }
}
