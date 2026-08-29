/** Unique stock photos per demo SKU (Unsplash only — must match next.config remotePatterns). */

const BY_ID: Record<string, string> = {
  "oxford-shirt":
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop&auto=format",
  "selvedge-jeans":
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=800&fit=crop&auto=format",
  "merino-crew":
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop&auto=format",
  "wool-coat":
    "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop&auto=format",
  "leather-belt":
    "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=800&h=800&fit=crop&auto=format",
  "air-runner":
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&auto=format",
  "trail-hiker":
    "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&h=800&fit=crop&auto=format",
  "court-classic":
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&auto=format",
  "crew-socks":
    "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&h=800&fit=crop&auto=format",
  "shoe-cleaner":
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&auto=format",
  "canvas-tote":
    "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&h=800&fit=crop&auto=format",
  "crossbody-bag":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&auto=format",
  "silk-scarf":
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop&auto=format",
  "aviator-shades":
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop&auto=format",
  "beaded-bracelet":
    "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=800&fit=crop&auto=format",
  shirt:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&auto=format",
  "borneo-cap":
    "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&auto=format",
};

const BY_TITLE: Array<{ match: RegExp; src: string }> = [
  { match: /oxford|shirt|tee|hackathon/i, src: BY_ID["oxford-shirt"] },
  { match: /jeans?|denim|pants?/i, src: BY_ID["selvedge-jeans"] },
  { match: /merino|crew|sweater|knit/i, src: BY_ID["merino-crew"] },
  { match: /coat|overcoat|jacket/i, src: BY_ID["wool-coat"] },
  { match: /belt/i, src: BY_ID["leather-belt"] },
  { match: /runner|sneaker|air/i, src: BY_ID["air-runner"] },
  { match: /trail|hiker|boot/i, src: BY_ID["trail-hiker"] },
  { match: /court|classic|tennis/i, src: BY_ID["court-classic"] },
  { match: /sock/i, src: BY_ID["crew-socks"] },
  { match: /cleaner|shoe kit/i, src: BY_ID["shoe-cleaner"] },
  { match: /tote/i, src: BY_ID["canvas-tote"] },
  { match: /crossbody|bag|purse/i, src: BY_ID["crossbody-bag"] },
  { match: /scarf/i, src: BY_ID["silk-scarf"] },
  { match: /shade|sunglass|aviator/i, src: BY_ID["aviator-shades"] },
  { match: /bracelet|bead|jewelry/i, src: BY_ID["beaded-bracelet"] },
  { match: /cap|hat/i, src: BY_ID["borneo-cap"] },
];

/** Pool used when no id/title rule matches — fashion Unsplash shots. */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop&auto=format",
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
  const seed = id || title || "borneo";
  return FALLBACKS[hashSeed(seed) % FALLBACKS.length]!;
}
