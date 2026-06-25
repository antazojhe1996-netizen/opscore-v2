/**
 * OPSCORE MAINTENANCE SYSTEM
 * Simple global toggle via environment variable
 */

export const MAINTENANCE_MODE =
  process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

/**
 * Optional helper (gagamitin natin later kung gusto mo ng upgrade)
 */
export const isMaintenanceActive = () => MAINTENANCE_MODE;


