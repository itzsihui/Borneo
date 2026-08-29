import { config } from "@/lib/config";
import type { StoreRecord } from "@/lib/store/types";

function sku(
  id: string,
  title: string,
  description: string,
  quantity: number,
  price: string,
) {
  return { id, title, description, quantity, price };
}

/** Demo shops from samples/ so /market looks like a real marketplace. */
export function sampleMarketStores(
  merchantAddress: `0x${string}` = config.merchantAddress,
): StoreRecord[] {
  const createdAt = new Date().toISOString();
  return [
    {
      slug: "petal-lane",
      name: "Petal Lane Flowers",
      merchantAddress,
      createdAt,
      skus: [
        sku("tulip-bouquet", "Tulip Bouquet", "10 stems, mixed colors", 15, "0.02"),
        sku("orchid-pot", "Orchid Pot", "Phalaenopsis in ceramic", 8, "0.05"),
        sku(
          "lavender-bundle",
          "Dried Lavender Bundle",
          "Aromatic, wrapped",
          20,
          "0.01",
        ),
        sku(
          "greeting-card",
          "Greeting Card",
          "Blank inside, botanical print",
          40,
          "0.01",
        ),
        sku("vase-small", "Vase Small", "Clear glass 15cm", 18, "0.03"),
      ],
    },
    {
      slug: "signal-phones",
      name: "Signal Phones",
      merchantAddress,
      createdAt,
      skus: [
        sku(
          "iphone-15",
          "iPhone 15",
          "Unlocked 128GB — agent checkout via x402",
          5,
          "0.08",
        ),
        sku(
          "galaxy-s24",
          "Samsung Galaxy S24",
          "Unlocked 256GB Android flagship",
          5,
          "0.07",
        ),
        sku("pixel-8", "Google Pixel 8", "Clean Android, great for demos", 3, "0.06"),
        sku("usbc-cable", "USB-C Cable 2m", "Braided charge + sync cable", 40, "0.01"),
        sku("magsafe-case", "MagSafe Case", "Clear case with MagSafe ring", 20, "0.02"),
      ],
    },
    {
      slug: "kiln-coffee",
      name: "Kiln Coffee Roaster",
      merchantAddress,
      createdAt,
      skus: [
        sku(
          "ethiopia",
          "Ethiopia Yirgacheffe 250g",
          "Washed lot, citrus + jasmine",
          30,
          "0.04",
        ),
        sku(
          "colombia",
          "Colombia Huila 250g",
          "Honey process, caramel",
          30,
          "0.03",
        ),
        sku("espresso", "House Espresso 1kg", "Chocolate-forward blend", 15, "0.05"),
        sku(
          "cold-brew",
          "Cold Brew Bottle 1L",
          "Concentrate, ready to dilute",
          24,
          "0.02",
        ),
        sku("tumbler", "Reusable Cup", "240ml double-wall tumbler", 40, "0.02"),
      ],
    },
    {
      slug: "hackathon-shirts",
      name: "StraitsX Hackathon Shirts",
      merchantAddress,
      createdAt,
      skus: [
        sku(
          "shirt",
          "StraitsX Hackathon Shirt",
          "Official AgentiX Playground tee. Priced in XSGD.",
          50,
          "0.01",
        ),
        sku("aisle-cap", "Aisle Cap", "Black cap for agent merchants", 20, "0.02"),
      ],
    },
  ];
}
