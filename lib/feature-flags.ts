/**
 * Pro-facing performance dashboard (`/dashboard/[token]`). Off by default until
 * there is enough traffic for stats to be meaningful.
 */
export function isProDashboardEnabled(): boolean {
  const raw = process.env.PRO_DASHBOARD_ENABLED?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}
