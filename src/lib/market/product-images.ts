/** Unique stock photos per demo SKU (Unsplash only — must match next.config remotePatterns). */

const BY_ID: Record<string, string> = {
  "tulip-bouquet":
    "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=800&h=800&fit=crop&auto=format",
  "orchid-pot":
    "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&h=800&fit=crop&auto=format",
  "lavender-bundle":
    "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&h=800&fit=crop&auto=format",
  "greeting-card":
    "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&h=800&fit=crop&auto=format",
  "vase-small":
    "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=800&fit=crop&auto=format",
  "iphone-15":
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop&auto=format",
  "galaxy-s24":
    "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop&auto=format",
  "pixel-8":
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop&auto=format",
  "usbc-cable":
    "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&h=800&fit=crop&auto=format",
  "magsafe-case":
    "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&h=800&fit=crop&auto=format",
  ethiopia:
    "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=800&fit=crop&auto=format",
  colombia:
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&h=800&fit=crop&auto=format",
  espresso:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop&auto=format",
  "cold-brew":
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&h=800&fit=crop&auto=format",
  tumbler:
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop&auto=format",
  shirt:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format",
  "aisle-cap":
    "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&auto=format",
};

const BY_TITLE: Array<{ match: RegExp; src: string }> = [
  { match: /tulip/i, src: BY_ID["tulip-bouquet"] },
  { match: /orchid/i, src: BY_ID["orchid-pot"] },
  { match: /lavender/i, src: BY_ID["lavender-bundle"] },
  { match: /greeting|card|sticker/i, src: BY_ID["greeting-card"] },
  { match: /vase/i, src: BY_ID["vase-small"] },
  { match: /iphone/i, src: BY_ID["iphone-15"] },
  { match: /galaxy|samsung/i, src: BY_ID["galaxy-s24"] },
  { match: /pixel/i, src: BY_ID["pixel-8"] },
  { match: /usb|cable/i, src: BY_ID["usbc-cable"] },
  { match: /magsafe|case/i, src: BY_ID["magsafe-case"] },
  { match: /ethiopia|yirgacheffe/i, src: BY_ID.ethiopia },
  { match: /colombia|huila/i, src: BY_ID.colombia },
  { match: /espresso/i, src: BY_ID.espresso },
  { match: /cold brew/i, src: BY_ID["cold-brew"] },
  { match: /cup|tumbler/i, src: BY_ID.tumbler },
  { match: /shirt|tee|hackathon/i, src: BY_ID.shirt },
  { match: /cap|hat/i, src: BY_ID["aisle-cap"] },
  {
    match: /pen|pencil|eraser|stationery/i,
    src: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&h=800&fit=crop&auto=format",
  },
  {
    match: /jeans?|denim|pants?/i,
    src: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=800&fit=crop&auto=format",
  },
];

/** Pool used when no id/title rule matches — all on images.unsplash.com. */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop&auto=format",
];

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function imageForProduct(
  title: string,
  description?: string,
  id?: string,
): string {
  if (id && BY_ID[id]) return BY_ID[id];
  const hay = `${title} ${description || ""}`;
  for (const rule of BY_TITLE) {
    if (rule.match.test(hay)) return rule.src;
  }
  // Stay on Unsplash — picsum.photos is not in next/image remotePatterns (breaks on Vercel).
  const seed = id || title || "aisle";
  return FALLBACKS[hashSeed(seed) % FALLBACKS.length]!;
}
