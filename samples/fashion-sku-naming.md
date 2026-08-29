# Fashion SKU naming conventions

Sellable units use composed titles. Parent style stays editable on the inventory form; axes come from the subcategory taxonomy.

| Arity | Pattern | Example |
|-------|---------|---------|
| 1D | Style / Color | `Wallet / Black` |
| 2D | Style / Color / Size | `Oxford Shirt / Navy / M` |
| 3D bottoms | Style / Color / WaistxInseam | `Jeans / Indigo / 30x32` |
| 3D intimates | Style / Color / BandCup | `Bra / Nude / 34B` |

## Subcategory → required axes

| Subcategory | Required | Optional |
|-------------|----------|----------|
| Tops & Outerwear | color, size | fit |
| Bottoms | color, waist, inseam | fit |
| Dresses & Jumpsuits | color, size | length |
| Footwear | color, size | width |
| Intimates & Swimwear | color, band, cup | size |
| Bags & Luggage | color | material, size |
| Belts & SLG | color | size, finish |
| Jewelry | metal, size | finish |
| Eyewear | frameColor | lensColor, size |
| Hats & Headwear | color, size | — |
| Soft Accessories | color | pattern, size |

## Tracking hints

- **Batch**: apparel dye lots (tops, bottoms, most accessories)
- **Serial**: high-value bags / fine jewelry — noted in SKU description for agents

Merchants must complete every required axis (plus qty and USDC price) on the edit form before publish. Titles are composed from the final edited attributes.
