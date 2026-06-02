# Spreadsheet App Availability Refresh - 2026-06-02

Status: Blocked. No native local spreadsheet application is available for Excel/secondary-app open, recalculation, or print-preview proof.

## Scope

- Repository: `/Users/philiplewis/archestimator`
- Current head at capture time: `6c22c3f`
- Workbook artifact: `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/lewis-residence-demo-proposal-2026-06-02.xlsx`
- Posture: local read-only environment inspection. The workbook was not opened, uploaded, or transmitted to a third party.

## Commands

```bash
which libreoffice || true
which soffice || true
ls -1 /Applications | rg -i 'excel|libre|openoffice|numbers|onlyoffice|wps|sheet|office' || true
ls -1 /System/Applications | rg -i 'numbers|office|sheet' || true
mdls -name kMDItemKind -name kMDItemDisplayName -name kMDItemCFBundleIdentifier '/Applications/Google Sheets.app' || true
plutil -p '/Applications/Google Sheets.app/Contents/Info.plist'
osascript -e 'id of app "Google Sheets"' 2>/dev/null || true
```

## Results

```text
libreoffice not found
soffice not found
/Applications match: Google Sheets.app
/System/Applications spreadsheet matches: none
kMDItemCFBundleIdentifier = "com.google.drivefs.shortcuts.sheets"
kMDItemDisplayName        = "Google Sheets"
kMDItemKind               = "Application"
CFBundleIdentifier        = "com.google.drivefs.shortcuts.sheets"
CFBundleShortVersionString = "123.0"
osascript bundle id       = "com.google.drivefs.shortcuts.sheets"
```

## Interpretation

- Microsoft Excel was not found.
- Apple Numbers was not found.
- LibreOffice / `soffice` was not found.
- Google Sheets is installed as a Google Drive shortcut app (`com.google.drivefs.shortcuts.sheets`), not as a native local spreadsheet engine.
- Using Google Sheets to open the workbook would likely require sign-in and/or upload/transmit the workbook to Google. That is not acceptable as an autonomous local proof step without explicit owner-approved manual QA because the workbook contains project/demo estimating data and the manual proof rules prohibit unsanitized provider transmission.

## Launch Meaning

Spreadsheet compatibility remains **NO-GO**.

The existing workbook artifact, ExcelJS readback, ZIP integrity proof, no-blank-total scan, and Quick Look thumbnail remain useful local evidence. They still do not prove:

- Microsoft Excel open/recalculation/print preview.
- A secondary spreadsheet app open/recalculation/print preview.
- Google Sheets import/render/recalculation behavior.

Next acceptable proof options:

1. Owner/manual QA opens the workbook in Microsoft Excel plus a secondary app and archives sanitized screenshots/notes.
2. A native local spreadsheet app such as Numbers or LibreOffice is installed and used for read-only local proof.
3. Owner explicitly approves uploading/importing the sanitized workbook to Google Sheets for secondary-app proof.
