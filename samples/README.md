# Sample inventories

Drop any CSV on **Open a store** (`/onboard`). Fashion samples include variant columns so size/color land in the edit form.

## Fashion CSV columns

Required: `title`, `quantity`, `price` (USDC)

Recommended fashion columns:

| Column | Used for |
|--------|----------|
| `subcategory` | `tops` `bottoms` `dresses` `footwear` `intimates` `bags` `belts_slg` `jewelry` `eyewear` `hats` `soft_accessories` |
| `style` | Parent style name (defaults to title) |
| `color` / `size` / `fit` | Tops dresses hats footwear |
| `waist` / `inseam` | Bottoms (e.g. `30` + `32` → `30x32`) |
| `band` / `cup` | Intimates (e.g. `34` + `B` → `34B`) |
| `material` / `width` / `length` / `metal` | Optional axes by subcategory |
| `description` | Free-text blurb |

Each **row = one sellable SKU** (one size/color). Do not put `S,M,L` in a single cell if you want separate stock counts.

See also: [`fashion-sku-naming.md`](fashion-sku-naming.md)

## Fashion samples (use these)

| File | Covers |
|------|--------|
| `clothing-boutique.csv` | Tops — oxford / merino / coat / linen tee with color+size+fit |
| `denim-and-chinos.csv` | Bottoms — jeans / chinos / shorts with waist×inseam |
| `sneaker-drop.csv` | Footwear — runners / hikers / court with US size+width |
| `dresses-jumpsuits.csv` | Dresses — midi / jumpsuit / gown with size+length |
| `hats-headwear.csv` | Caps / beanies / bucket with circumference size |
| `bags-and-slg.csv` | Bags + belts + scarf + gloves (1D / light 2D) |
| `intimates-swim.csv` | Bras + swimsuit with band+cup |
| `hackathon-inventory.csv` | VISA tee + Borneo cap sized for demo |

## Legacy / non-fashion demos

Still importable (parser classifies subcategory from title; you fill missing axes in the form):

| File | Vibe |
|------|------|
| `phone-store.csv` | Phones |
| `coffee-roaster.csv` | Coffee |
| `bookstore.csv` | Books |
| `snack-kiosk.csv` | Snacks |
| `flower-shop.csv` | Flowers |
| `stationery.csv` | Desk |
| `skincare.csv` | Beauty |
| `camera-gear.csv` | Photo |

Example chat: `12 navy oxford shirts S M L` then complete sizes/colors in the inventory form.
