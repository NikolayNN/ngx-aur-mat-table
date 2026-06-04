import { StyleBuilder } from './style-builder';
import Row = StyleBuilder.Row;
import FontWeight = StyleBuilder.FontWeight;

describe('StyleBuilder.Row', () => {
  it('exposes the configured color via colorValue, empty string when unset', () => {
    expect(Row.builder().color('red').colorValue).toBe('red');
    expect(Row.builder().background('blue').colorValue).toBe('');
  });

  it('overrideWith lets the overlay win per field and preserves base-only fields', () => {
    const base = Row.builder().color('red').fontWeight(FontWeight.BOLD);
    const overlay = Row.builder().background('yellow').color('green');
    const css = base.overrideWith(overlay).build();
    expect(css).toContain('color: green;');
    expect(css).toContain('font-weight: bold;');
    expect(css).toContain('background: yellow;');
    expect(css).not.toContain('color: red;');
  });

  it('overrideWith does not mutate the operands', () => {
    const base = Row.builder().color('red');
    const overlay = Row.builder().color('green');
    base.overrideWith(overlay);
    expect(base.colorValue).toBe('red');
    expect(overlay.colorValue).toBe('green');
  });
});
