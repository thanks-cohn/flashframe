# Memorew

Memorew is a time layer built on top of Flashframe.

Flashframe owns the workspace and the block contract. Memorew records those block states over time and lets the user return to an earlier moment.

The concept should stay simple.

## Core idea

A remembered moment is just a Flashframe-like state associated with a time.

Memorew does not try to freeze a whole computer, browser process, JavaScript heap, or operating system.

It remembers the few properties that make a supported Flashframe block feel like it has returned to the same moment.

Examples:

### Text

Remember:

```text
name
text
visible position / scroll position
cursor position?  // optional
```

If the external text file is later edited or deleted, the remembered text can still be restored because the text itself belongs to the remembered state.

### PDF

Remember:

```text
name
source
page
```

The defining behavior is simply that the PDF reopens on the page the user was reading.

### Directory lightbox

Remember:

```text
name
directory source
current image
```

The gallery returns to the same image rather than merely reopening the directory at its beginning.

### Local video

Remember:

```text
name
video source
timestamp
```

The video returns to the point where the user had left it.

### Every block

Flashframe already supplies:

```text
x
y
width
height
z
```

So Memorew does not need a second spatial system.

## What a remembered moment means

Suppose at 4:17 PM the workspace contains:

- `Chapter 4`, halfway written and scrolled to the middle
- `Sources.pdf`, page 83
- `References`, displaying `image_142.png`
- `Lecture.mp4`, 31:18

When the user returns to the 4:17 PM moment, those names and states should return with their old positions and sizes.

That is the product.

There is no need to make the concept larger than that.

## Historical text

Text is special because it is small and because a previous version is often exactly what the user wants to recover.

A historical text block must preserve the text content that existed at that moment. It must not simply point to the current external file and hope the file still contains the same words.

The first implementation can store complete text snapshots. More sophisticated deduplication or deltas can be added only if storage measurements prove they are needed.

Correctness is more important than clever compression.

## Large media

Videos, PDFs, and image directories are normally source references plus lightweight state.

A remembered video timestamp is useful while the source video still exists. Memorew does not need to duplicate a multi-gigabyte video for every remembered moment.

If a source has disappeared, the corresponding block should remain visible with its remembered name, state, and geometry and offer relinking where possible.

Historical text is the important exception because preserving the actual old text is cheap and useful.

## Recording moments

Memorew can initially record at meaningful events rather than trying to write state every animation frame.

Examples:

- text edit after a short debounce
- text scroll settles
- PDF page changes
- gallery image changes
- video seeks or periodically advances enough to matter
- block move/resize finishes
- block is added, removed, or renamed

A later implementation may coalesce these changes into periodic timeline points.

The exact checkpoint frequency is a policy decision, not part of the block contract.

## Restoring a moment

Restoration should be safe.

Opening an old moment should first create a live workspace derived from that historical state. It should not automatically rewrite current files on disk merely because the user looked backward in time.

For text, the user may later choose to save/export the restored version back to disk.

For other blocks, the remembered state can be applied to the live block while leaving the underlying source untouched.

## Relationship to named Flashframes

A named Flashframe is deliberate:

> Save this arrangement.

Memorew is temporal:

> Show me this arrangement as it was then.

Both rely on the same serialization and restoration machinery.

The implementation should resist creating two different snapshot formats. A historical moment can use the same block records as a named Flashframe plus timeline metadata.

## Suggested moment record

Conceptually:

```json
{
  "schemaVersion": 1,
  "id": "moment-id",
  "workspaceId": "workspace-id",
  "capturedAt": "2026-08-22T21:17:00.000Z",
  "blocks": []
}
```

A text block record in that moment may contain:

```json
{
  "id": "chapter-4",
  "type": "text",
  "name": "Chapter 4",
  "geometry": {
    "x": 40,
    "y": 60,
    "width": 700,
    "height": 760,
    "z": 2
  },
  "source": {
    "displayName": "chapter-4.txt",
    "handleKey": "optional-current-file-handle"
  },
  "state": {
    "text": "The text as it existed at this moment...",
    "scrollTop": 1140,
    "cursorOffset": 2841
  }
}
```

A PDF block can be much smaller:

```json
{
  "id": "source-pdf",
  "type": "pdf",
  "name": "Sources",
  "geometry": {},
  "source": {
    "displayName": "sources.pdf",
    "handleKey": "pdf-handle"
  },
  "state": {
    "page": 83
  }
}
```

The same idea applies to galleries and videos.

## The rule

Do not ask, "Can we preserve every possible property?"

Ask:

> What is the smallest state that makes this block feel like the user returned to the same moment?

That is what Memorew records.