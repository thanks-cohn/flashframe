# Object menus and standalone Canvas

Framechute deliberately keeps selection separate from controls. Clicking an object selects it; it does not restore dismissed controls. The circular **☰** button and right-click both open the same object menu. Controls visibility belongs to each image or Canvas and is persisted in FCX workspace state.

Choosing **Hide Controls** (or closing the Quick Actions bar with ×) puts that object into a clean image-only state: the Quick Actions bar, blue selection outline, and circular **☰** button all disappear together while the object remains selected internally. Ordinary clicks do not bring that chrome back. Right-click the object and choose **Show Controls** to restore it.

Choose **Upload → New Canvas**, then use a preset, the current view, or a custom pixel size. New canvases have a transparent PNG base and use the existing image paint overlay for Brush, Bucket, Erase, Undo, transforms, and export. Canvas objects therefore move, resize, duplicate, remove, save as PNG/WebP, and round-trip through FCX like imported image objects.

Canvas creation is limited to 4,096 pixels on either axis and 8,388,608 pixels total. The transparent PNG backing is encoded asynchronously so creation cannot block the interface with an unbounded synchronous data-URL conversion; oversized input is rejected in the dialog with a clear explanation.

PNG and WebP retain transparency. JPEG remains available through the common image exporter and is flattened against the chosen background.

## Browser smoke check

Hide Controls on one image and verify the Quick Actions bar, blue outline, and **☰** button all disappear. Click the image and confirm they remain hidden. Right-click it, choose **Show Controls**, and verify all three return. Confirm another image retains its own state. Create a transparent Canvas, paint/fill/erase/undo, export and reopen PNG, duplicate it, delete it, and confirm a painted Canvas with hidden controls survives an FCX export/import.
