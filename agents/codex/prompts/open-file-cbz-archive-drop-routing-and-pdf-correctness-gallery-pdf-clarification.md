# Superseding clarification: Gallery → PDF semantics

This file **supersedes the Gallery → PDF requirements** in:

`agents/codex/prompts/open-file-cbz-archive-drop-routing-and-pdf-correctness.md`

Do not implement Gallery → PDF as “all gallery images become a multi-page PDF.”

The intended Framechute behavior is deliberately simpler:

> **Treat the currently visible gallery image as if it were a normal single image, then run the ordinary image → PDF conversion path.**

## Required behavior

```text
Open/select a gallery
→ navigate to the image currently wanted
→ Convert to PDF
→ use ONLY the currently displayed gallery image
→ create a one-page PDF
→ add that PDF immediately as a normal first-class Framechute PDF object
```

Requirements:

- use the actual currently displayed gallery image pixels
- do not consume hidden gallery marker/state text
- do not convert the entire gallery
- do not create one PDF page per gallery entry
- preserve the current image's aspect ratio exactly as the normal image → PDF path does
- keep the original gallery unchanged
- the resulting PDF should behave exactly like a PDF produced from a normal singular image
- if the currently displayed gallery image is unavailable because the source needs reconnecting, use the normal reconnect flow rather than producing an empty or malformed PDF
- create the PDF as an immediate Framechute result object; saving to disk remains optional

The product rule is:

> **For conversion simplicity, a gallery presents one active image at a time. Image-like conversions operate on that active image unless an explicitly named batch/all-pages action exists.**

If a future feature is desired for converting an entire gallery to a multi-page PDF, it should be a separately named action such as **Gallery to multi-page PDF** or **Convert all gallery images to PDF**, not the default `Convert to PDF` action.

## Tests to use instead of the superseded tests

Replace any expectation that Gallery → PDF page count equals gallery image count with:

- Gallery → PDF produces exactly **one page**
- that page corresponds to the gallery's **currently displayed image**
- changing the gallery's current image before conversion changes which image goes into the one-page PDF
- hidden Framechute marker/state text never appears in the generated PDF

## Manual smoke test

```text
Open image folder as gallery
→ navigate to image 3
→ select gallery
→ Convert to PDF
→ a new one-page PDF object appears
→ page visually matches image 3
→ gallery remains unchanged

Navigate gallery to image 7
→ Convert to PDF again
→ a second one-page PDF object appears
→ page visually matches image 7
```

This clarification takes precedence over any conflicting Gallery → PDF language in the earlier prompt.