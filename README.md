# VMF Asset Packer

Local web utility for collecting Source Engine / Garry's Mod map assets from a VMF into an output folder.

The app is built for mapper workstations with large local content libraries. The browser provides the UI, while the localhost helper server reads local folders directly, so you do not need to upload hundreds of gigabytes of `materials`, `models`, or `sound` content anywhere.

## Features

- Pick a `.vmf` file through the Windows file dialog.
- Add multiple content roots, such as Garry's Mod `garrysmod/` and custom content folders.
- Copy found loose assets into an output folder while preserving relative paths.
- Optionally clean the output folder before each run.
- Track progress and errors in the web UI through server-sent events.
- CLI mode for scripted local runs.

## Requirements

- Windows
- Node.js
- A local Source / Garry's Mod content folder.
- `bin/source_asset_tracer.exe` present in the project, or `SOURCE_ASSET_TRACER_PATH` pointing to a local build.

## Install

```powershell
npm install
```

## Web UI

```powershell
npm run dev:web
```

Open:

```text
http://127.0.0.1:5780/
```

If that port is already busy:

```powershell
$env:PORT = "5781"
npm run dev:web
```

In the UI:

1. Choose the VMF file.
2. Add one or more content roots.
3. Choose the output folder.
4. Enable the clean-output checkbox only when you want a clean output folder.
5. Click the run button.

## CLI

```powershell
npm run dev:cli
```

Optional environment variables:

```powershell
$env:VMF_PATH = "E:\maps\example.vmf"
$env:OUTPUT_PATH = "E:\packed-map"
$env:CONTENT_ROOTS = "F:\steam\steamapps\common\GarrysMod\garrysmod;E:\gmod-content"
$env:CLEAN_OUTPUT = "1"
$env:SOURCE_ASSET_TRACER_PATH = "E:\prog\rust\source-asset-tracer\source_asset_tracer\target\debug\source_asset_tracer.exe"
npm run dev:cli
```

`CONTENT_ROOTS` is semicolon-separated.
`SOURCE_ASSET_TRACER_PATH` is optional. By default the app tries `bin/source_asset_tracer.exe`, then the local Rust debug build path above if it exists.

## Notes

- The output-clean option has safety checks and refuses to clean dangerous locations such as a drive root, a folder containing the VMF, or a folder containing a content root.
- Large content folders are read locally by the helper server. This project is intended for trusted localhost use, not public internet hosting.
- The current scanner focuses on loose files under content roots. VPK/GMA indexing can be added later if needed.
