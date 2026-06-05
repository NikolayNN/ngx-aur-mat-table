import { isFeatureEnabled } from './feature-enabled.util';

describe('isFeatureEnabled', () => {
  it('returns false when the config is undefined', () => {
    expect(isFeatureEnabled(undefined)).toBe(false);
  });

  it('returns false when the config is null', () => {
    expect(isFeatureEnabled(null)).toBe(false);
  });

  it('returns true when the config is present without enable', () => {
    expect(isFeatureEnabled({})).toBe(true);
  });

  it('returns true when enable is true', () => {
    expect(isFeatureEnabled({ enable: true })).toBe(true);
  });

  it('returns false when enable is false', () => {
    expect(isFeatureEnabled({ enable: false })).toBe(false);
  });
});
