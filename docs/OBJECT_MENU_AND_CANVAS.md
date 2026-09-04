# Object menus and standalone Canvas

Framechute deliberately keeps selection separate from controls. Clicking an object selects it; it does not restore dismissed Quick Actions. The circular **☰** button and right-click both open the same object menu. Quick Actions visibility belongs to each image or Canvas and is persisted in FCX workspace state.

Choose **Upload → New Canvas**, then use a preset, the current view, or a custom pixel size. New canvases have a transparent PNG base and use the existing image paint overlay for Brush, Bucket, Erase, Undo, transforms, and export. Canvas objects therefore move, resize, duplicate, remove, save as PNG/WebP, and round-trip through FCX like imported image objects.

PNG and WebP retain transparency. JPEG remains available through the common image exporter and is flattened against the chosen background.

## Browser smoke check

Hide Quick Actions on one image, click it and verify they remain hidden. Open **☰**, explicitly show them, then right-click and hide them. Confirm another image retains its own state. Create a transparent Canvas, paint/fill/erase/undo, export and reopen PNG, duplicate it, delete it, and confirm a painted Canvas with hidden Quick Actions survives an FCX export/import.
