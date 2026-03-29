# electron-native-share

Universal native Share API for Electron apps. Brings the OS share sheet to your desktop app — macOS `NSSharingServicePicker`, Windows `DataTransferManager`, with a clipboard fallback for Linux.

## Install

```bash
npm install electron-native-share
```

Prebuilt binaries are included for macOS and Windows. No C++ compiler required for most users.

## Usage

```typescript
import { share, canShare } from 'electron-native-share';

// Check if native sharing is available on this platform
if (canShare()) {
  console.log('Native share sheet available');
}

// Share content (from Electron main process)
const result = await share({
  title: 'Check this out',
  text: 'Hello from my Electron app!',
  url: 'https://example.com',
});

console.log(result);
// { native: true, method: 'native' }
```

### Sharing files

```typescript
await share({
  title: 'My document',
  files: ['/absolute/path/to/document.pdf'],
});
```

### With a specific BrowserWindow

Pass the Electron `BrowserWindow` instance as the second argument so the share sheet anchors to the correct window:

```typescript
import { BrowserWindow } from 'electron';
import { share } from 'electron-native-share';

const win = new BrowserWindow({ width: 800, height: 600 });

await share({ text: 'Hello!' }, win);
```

## API

### `canShare(): boolean`

Returns `true` if native sharing is available on the current platform (macOS or Windows).

### `share(options, browserWindow?): Promise<ShareResult>`

Opens the native share sheet with the given content.

**Options:**

| Property | Type       | Description                         |
| -------- | ---------- | ----------------------------------- |
| `title`  | `string?`  | Share title                         |
| `text`   | `string?`  | Text content to share               |
| `url`    | `string?`  | URL to share                        |
| `files`  | `string[]?`| Array of absolute file paths        |

At least one of `title`, `text`, `url`, or `files` must be provided.

**Returns:** `Promise<ShareResult>`

```typescript
interface ShareResult {
  native: boolean;            // true if native share sheet was used
  method: 'native' | 'clipboard' | 'none';
}
```

### `getNativeWindowHandle(browserWindow): Buffer | undefined`

Utility to extract the native window handle from an Electron `BrowserWindow`.

## Platform Support

| Platform | Method                            | Status |
| -------- | --------------------------------- | ------ |
| macOS    | `NSSharingServicePicker`          | ✅      |
| Windows  | WinRT `DataTransferManager`       | ✅      |
| Linux    | Clipboard fallback                | ✅      |

## Building from source

If prebuilt binaries aren't available for your platform:

```bash
npm run build        # Compile TypeScript + native addon
npm run build:ts     # TypeScript only
npm run build:native # Native addon only (requires C++ toolchain)
```

### Requirements for building native addon

- **macOS**: Xcode command line tools
- **Windows**: Visual Studio with C++ Desktop workload + Windows 10 SDK

## Example Electron App

A minimal example app is included in `examples/electron-app/`:

```bash
cd examples/electron-app
npm install
npm start
```

## License

MIT
