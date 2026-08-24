FrameChute packaged Grab artwork
===============================

Drop transparent PNG artwork into this directory using these exact names:

- default.png  -> normal compact Grab state and normal Media-player Grab
- hover.png    -> pointer/focus Grab state
- faded.png    -> delayed faded Grab state
- expanded.png -> Grab state while block headers/expanded controls are visible

Runtime paths:
/assets/grab/default.png
/assets/grab/hover.png
/assets/grab/faded.png
/assets/grab/expanded.png

Resolution order:
1. User-uploaded image for the exact state
2. User-uploaded Default image
3. Packaged image for the exact state in this directory
4. Packaged default.png
5. Existing inline fallback only if no usable image is available

Do not rename old flashframe.* storage keys. They remain compatibility identifiers for existing users.