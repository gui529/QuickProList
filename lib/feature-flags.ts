/**
 * Pro-facing performance dashboard (`/dashboard/[token]`). Off by default until
 * there is enough traffic for stats to be meaningful.
 */
export function isProDashboardEnabled(): boolean {
  const raw = process.env.PRO_DASHBOARD_ENABLED?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

/**
 * Contractor listing previews (`/preview/<token>`). Off unless explicitly
 * enabled, so production stays 404 for `/preview/*` even after this code
 * ships. Turn on for the dev site with `PREVIEW_PAGES_ENABLED=true`.
 */
export function isPreviewPagesEnabled(): boolean {
  const raw = process.env.PREVIEW_PAGES_ENABLED?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}
