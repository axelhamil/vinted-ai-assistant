# Extension

Chrome extension (Manifest V3) built with WXT, React 19 and Tailwind 4. It needs the api running, see the [root README](../../README.md).

## Develop

```bash
pnpm dev:ext
```

WXT opens Chrome with the extension loaded and reloads it on change.

## Build and load unpacked

```bash
pnpm --filter extension build
```

1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select `apps/extension/.output/chrome-mv3`.

Release builds are attached as a zip to each GitHub release.

## Backend URL

The api address defaults to `http://localhost:3000`. Change it in the popup settings when the api runs on another host or port (for example `API_PORT` in production). Only `http` and `https` URLs are accepted.

## Test

```bash
pnpm --filter extension test
```

Vitest with the `WxtVitest` plugin, happy-dom and fake-indexeddb.
