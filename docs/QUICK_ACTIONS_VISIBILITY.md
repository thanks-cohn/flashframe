# Per-image Quick Actions visibility

Quick Actions chrome can be dismissed independently for image objects without disabling the underlying actions.

- Select an image and use the small `×` on the Quick Actions bar to hide Quick Actions for that image.
- Right-click an image to toggle **Show Quick Actions** / **Hide Quick Actions** for that specific image.
- Hiding the toolbar does not deselect, delete, or modify the image.
- The hidden/shown choice is workspace UI state and is persisted through ordinary FrameChute/FCX block state capture.
- The preference is never baked into exported image bytes.

For multi-selection, the close button is available only when the current selection consists entirely of images; closing hides Quick Actions for all selected images. A mixed selection keeps the shared toolbar available.
