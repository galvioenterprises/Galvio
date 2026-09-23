# Product image sizing design QA

## Evidence

- Baseline: the user-supplied 1920 x 1200 Galvio product-page screenshot. It
  shows the official AC photograph rendered small inside both its original
  square canvas and a padded grey gallery panel.
- Final desktop product page: `/tmp/galvio-product-after.png` at 1920 x 1200.
- Final desktop catalogue: `/tmp/galvio-listing-after.png` at 1920 x 1200.
- Final mobile product page: `/tmp/galvio-product-mobile-final-2.png` at
  390 x 844.
- Tall-product regression check: `/tmp/galvio-tall-desktop-final.png` at
  1920 x 1200.
- Cross-category processed-image contact sheet:
  `/tmp/galvio-primary-contact.png`.
- All captures use device scale factor 1 and the first product image selected.
  Retina readiness was checked against the generated `srcset` manifest rather
  than inferred from those screenshots.

## Comparison

The baseline gave the gallery only about 300 px of useful width, then placed a
1200 x 1200 manufacturer canvas inside a padded grey box. The product occupied
only a narrow band within that source canvas, so increasing the CSS box alone
would not solve the visible-size problem.

The final desktop page uses the wider catalogue container, keeps the delivery
panel from compressing the gallery below the 2xl breakpoint, removes the nested
grey image panel, and provides a responsive 460-540 px gallery stage. On the
checked AC, the official product now spans roughly 620 px horizontally while
remaining fully contained and uncropped. The tall visi-cooler uses the same
stage vertically without distortion.

Catalogue cards now use a 224-272 px responsive image stage instead of 160 px.
The main catalogue stops at three columns, while wider promotional sections
stop at four, so product imagery remains legible instead of being reduced to a
small object inside a narrow card.

## Image fidelity

- Source assets remain unchanged in `assets/products/`.
- Only the first manufacturer shot receives display preprocessing. The image
  builder trims an outer border matching the corner pixel and retains a 24 px
  safety margin. This handles both white JPEG canvases and transparent PNG
  canvases without removing internal white appliance pixels.
- Secondary gallery panels retain the manufacturer's full canvas and ordering.
- The checked 1200 x 1200 AC source becomes a 1142 x 410 display derivative;
  the checked transparent 500 x 500 AC source becomes 476 x 194. Neither is
  stretched, reconstructed, or AI-generated.
- Every gallery derivative retains its natural width up to 1600 px, with AVIF
  and WebP responsive variants. The manifest records post-trim intrinsic
  dimensions for primary shots and source dimensions for secondary panels so
  browser aspect ratios remain correct.

## Responsive and accessibility checks

- At 390 px, the main image fills the available card width, the thumbnail rail
  remains horizontally scrollable, and title/price content stays within the
  viewport.
- Wide AC, window AC, air-cooler, freezer, stabiliser, and tall visi-cooler
  hero images were visually checked for crop and distortion.
- All 3,850 files referenced by the 482-entry image manifest were decoded and
  checked for their declared widths; no file, decode, or dimension error was
  found. Primary, secondary, and cutout transforms all carry explicit cache
  processor versions.
- Existing thumbnail click, previous/next controls, swipe handling, keyboard
  navigation, selected-state ARIA, and auto-scroll behavior were preserved.

## Findings

No actionable P0, P1, or P2 sizing/fidelity issues remain in the requested
product-card and product-gallery scope.

final result: passed
