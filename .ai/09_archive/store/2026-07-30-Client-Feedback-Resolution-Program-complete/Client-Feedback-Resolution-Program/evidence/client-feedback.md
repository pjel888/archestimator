# Sanitized Client Feedback Source

## Provenance

- Received in the active Codex task on 2026-07-28 (Asia/Manila).
- Content below preserves the client's wording while excluding account, project,
  tenant, and credential data.
- This artifact is product input, not proof of any technical root cause.

## Original Feedback

> ARCHESTIMATOR Comments:
>
> 1. Maybe this is just me, but the native font size could maybe be 10% bigger?
> (Zoomed the browser at 110% and found it perfect)
>
> 2. Sometimes takes a couple of seconds for the page to load but I think that's
> a server or internet issue. Not sure.
>
> 3. Editing of Material Components
> - V-1 (Default) not sure how to change to V-2 for other options?
> - Brands / Suppliers with selection (can we access a master list for this?)
> - Encountered an error after adding a material (see image)
> - Uploading of image fails if uploaded in the Page 001 Column but successful if
> done at the EDIT COMPONENT window
> - Syncing of brand name fails in the PROJECT tab
> - Direct Category seems to be uneditable?
> - Perhaps an option to add accessories under a specific main material? (e.g.
> total price for applicable accessory products of a wpc plank such as alum
> clips, termination clips, etc.) although I was able to create a sub 'AREA' for
> this.
>
> SUMMARY OF ESTIMATES
> - Perhaps a feature where we can toggle on/off specific materials (say we have
> 3 options/versions [V-1, V-2, V-3] of the same material) and then once value
> engineering is needed, we can just select the preferred material and then it
> can sync to the total cost of the project?
> - Possible to add sub total price per main area in the Estimate Tree? I think
> it helps to quickly identify which areas can be value engineered or not.

## Follow-up Feedback

> oh! last na. If it could have a column perhaps for remarks say may quotation na
> available for the material and it could either be VAT INC or VAT EX for clients
> na may mga requirements na need VAT INC. 😃

## Screenshot Fingerprint

- Original transient path:
  `C:/Users/phili/AppData/Local/Temp/codex-clipboard-40d3fbf1-c172-44e8-9863-219ef97c0819.png`
- SHA-256:
  `1745df9b50bc3b92825ea094f79763dbf8a42e934dc717b48f875c3c0673bb55`
- Size: 58,001 bytes.
- Visible surface: `Estimate learning`, `In progress`, and
  `Edits save automatically`.
- Visible error class: Next.js production Server Components render diagnostic
  with the specific message omitted and a digest referenced.
- Interpretation boundary: the image proves the affected UI surface and message
  class. It does not identify the server-side exception or prove that any
  historical log record came from the same user session.

## Clarification Applied by the Plan

The phrase `VAT EX` is ambiguous in practice. The implementation plan therefore
keeps `VAT Exclusive` and `VAT Exempt` as separate structured treatments, in
addition to `VAT Inclusive`, and does not infer exemption from a free-text
remark.
