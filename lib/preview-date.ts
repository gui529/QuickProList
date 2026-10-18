/** Calendar date for preview end copy. Georgia listings use Eastern time. */
export function formatPreviewEndDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}
