# ARC9 Russian Pre-2014 Cleanup

Utility script for rebuilding the ARC9 locked core split content with only Russian/Soviet weapons whose first listed year is before 2014, plus the attachments and assets still used by those weapons.

The script never edits the source split folders when run with `--apply`. It recreates the result in a separate output folder and merges both split parts into one addon root.

## Dry Run

```powershell
npm run clean:arc9-russian-pre2014 -- --verbose
```

## Apply

```powershell
npm run clean:arc9-russian-pre2014 -- --apply --output=E:\prog\vmf-asset-packer\workspace\06_content_split_russian_pre2014
```

If the output folder already exists and is not empty:

```powershell
npm run clean:arc9-russian-pre2014 -- --apply --output=E:\prog\vmf-asset-packer\workspace\06_content_split_russian_pre2014 --clean-output
```

## Safety Checks

The report is written to:

```text
workspace/arc9_russian_pre2014_cleanup_report.json
```

The script checks:

- shared attachment categories used by kept weapons;
- installed attachments referenced by kept weapons;
- shared models, materials, sounds, and particles used by both kept and dropped content;
- Source model material slots, included MDL animation models, and VMT texture fields;
- shared envmap HDR fallback files generated from the existing non-HDR VTF when the source content does not include `.hdr.vtf`.
- malformed VMT files with extra trailing KeyValues braces, fixing only the copied output file.

If a safety check fails, `--apply` stops before writing the output.
