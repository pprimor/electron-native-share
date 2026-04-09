# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-30

### Fixed

- macOS share promise hung forever after user picked a sharing service — `ShareDelegate` now conforms to `NSSharingServiceDelegate` with `delegateForSharingService:` wiring
- macOS window handle pointer validated with `isKindOfClass:` before use to prevent crashes from invalid buffers
- Title is now set as `NSSharingService.subject` on macOS (used as email subject, etc.), matching Windows `DataPackage.Properties.Title` behavior
- Extracted cancellation error message to a constant to reduce fragile string coupling between native and TypeScript layers

### Added

- Happy-path tests for successful share, window handle passthrough, and full options forwarding

## [0.1.0] - 2026-03-29

### Added

- Native share sheet integration for macOS (`NSSharingServicePicker`) and Windows (WinRT `DataTransferManager`)
- `share(options, browserWindow?)` — opens the OS share sheet with text, URL, title, and/or files
- `canShare()` — checks whether native sharing is available on the current platform
- `getNativeWindowHandle(browserWindow)` — utility to extract the native window handle from an Electron `BrowserWindow`
- File sharing support with absolute path validation and existence checks
- URL validation restricted to `http:` and `https:` protocols
- Prebuilt native binaries for macOS (arm64, x64) and Windows (x64) via `prebuildify`
- Graceful install on unsupported platforms (`node-gyp-build || exit 0`)
- Cross-platform CI pipeline (ubuntu, macOS, Windows) with pack verification
- Example Electron app with file picker for end-to-end testing

[0.1.1]: https://github.com/pprimor/electron-native-share/releases/tag/v0.1.1
[0.1.0]: https://github.com/pprimor/electron-native-share/releases/tag/v0.1.0
