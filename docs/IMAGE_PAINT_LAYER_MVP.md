# Image paint layer MVP

FrameChute image painting is a nondestructive, intrinsic-pixel overlay attached to an existing image block. The original image remains the source. The render/export order is:

1. source pixels;
2. RGBA paint overlay;
3. existing crop, resize, rotate, straighten, flip, privacy, and annotation operations;
4. PNG/WebP encoding with alpha, or JPEG compositing over the chosen background.

The overlay state has a version, intrinsic dimensions, a PNG data URL, and a reserved nullable `sourceMask`. The PNG representation is captured through the normal block state event, so saved workspaces, duplication, and FCX snapshots use the existing state substrate. `sourceMask` is intentionally not exposed yet: the MVP does not imply that erasing overlay paint erases source pixels.

Bucket boundaries are detected from the current intrinsic source-plus-overlay composite. The iterative four-neighbour fill uses an explicit default RGBA tolerance and writes only to the overlay. A bounded stack and visited bitmap prevent recursion and repeated queue growth.

## Browser smoke checklist

- Open a PNG, select it, choose **Edit Image**, draw with mouse/pen/touch, change color and size, then choose **Done**.
- Draw a stroke, fill an enclosed line-art region, then press **Undo** twice; the fill and stroke should disappear in that order.
- Erase overlay paint and use Undo when the erased content should be restored; erasing never changes source pixels.
- Move, resize, maximize/restore, rotate, and flip the image; verify the overlay stays registered.
- Export and reopen an FCX snapshot; verify the overlay and image geometry return together.
- Use **Save As** for PNG and WebP and verify alpha; use JPEG and verify the selected background is explicit.

Crop creates an immediately visible PNG result object from the current source-plus-paint composite. The source object is unchanged. Generated crop bytes therefore travel through the same ordinary image-object and FCX paths as any other FrameChute result.

Object controls reserve predictable regions and stack levels: selection at top-left, Grab beside it, header actions at top-right, resize at bottom-right, and contextual paint controls outside the top edge. Delete and Backspace close the current Quick Actions selection through each block's existing Remove control, except while a dialog or editable/control surface owns the keyboard.
