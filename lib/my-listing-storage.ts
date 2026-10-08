export const MY_LISTING_STORAGE_KEY = 'quickprolist:myListing'

export function saveMyListingId(id: string): void {
  try {
    localStorage.setItem(MY_LISTING_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function loadMyListingId(): string | null {
  try {
    return localStorage.getItem(MY_LISTING_STORAGE_KEY)
  } catch {
    return null
  }
}
