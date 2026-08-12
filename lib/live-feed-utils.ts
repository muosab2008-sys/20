// Shared helpers for the live activity feed (ticker) that reads the data
// companies send to us through the /api/postback/* routes and stores in the
// "transactions" collection.

// Extract the offerwall/company name and clean offer title out of an offerName
// that postback routes store in the form: "Offer Title (Company)".
export function parseOfferName(rawOfferName: string | undefined | null): {
  offerName: string;
  company: string;
} {
  const raw = (rawOfferName || "").trim();
  const match = raw.match(/\(([^()]+)\)\s*$/);

  if (match) {
    const company = match[1].trim();
    const offerName = raw
      .slice(0, match.index)
      .trim()
      .replace(/[-–—]\s*$/, "")
      .trim();
    return { offerName: offerName || "Offer", company };
  }

  return { offerName: raw || "Offer", company: "" };
}

// The whole app uses this level formula (10,000 points per level).
export function calculateLevel(totalEarned: number): number {
  return Math.floor((totalEarned || 0) / 10000) + 1;
}

// Convert a Firestore Timestamp / Date / number into epoch milliseconds.
export function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (value?._seconds) return value._seconds * 1000;
  return 0;
}
