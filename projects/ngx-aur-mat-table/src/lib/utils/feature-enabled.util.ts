/**
 * A feature is enabled when its config object is present, unless `enable: false`.
 *
 * Used by features whose enabling signal is "config present" (Group 1). Features whose
 * enabling signal is something else (Hover → interaction, TotalRow → totalConverter
 * columns) must NOT use this helper — an absent config does not disable them.
 */
export function isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
  return !!cfg && cfg.enable !== false;
}
