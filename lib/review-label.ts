/** Plain stored rating, e.g. "4.8 · 120 reviews". No provider name or logo. */
export function storedReviewLabel(
  rating: number | null,
  reviewCount: number | null
): string | null {
  const ratingValue = rating == null ? NaN : Number(rating)
  const countValue = reviewCount == null ? NaN : Number(reviewCount)
  const hasRating = Number.isFinite(ratingValue)
  const hasCount = Number.isFinite(countValue)
  if (!hasRating && !hasCount) return null
  const ratingText = hasRating ? ratingValue.toFixed(1) : null
  const countText = hasCount ? `${countValue} ${countValue === 1 ? 'review' : 'reviews'}` : null
  if (ratingText && countText) return `${ratingText} · ${countText}`
  return ratingText ?? countText
}
