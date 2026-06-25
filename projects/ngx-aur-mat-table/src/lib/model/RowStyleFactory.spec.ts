import {RowStyleFactory} from './RowStyleFactory';
import {TableRow} from './TableRow';
import {TableConfig} from './ColumnConfig';
import {StyleBuilder} from '../style-builder/style-builder';

interface Row { name: string; bold?: boolean; }

function rows(...data: Row[]): TableRow<Row>[] {
  return data.map((d, i) => new TableRow<Row>(i, d));
}

function baseCfg(): TableConfig<Row> {
  return { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
}

describe('RowStyleFactory', () => {

  it('returns [] when bodyRowCfg.styleCfg is absent', () => {
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), baseCfg())).toEqual([]);
  });

  it('returns [] when styleCfg has neither class nor style', () => {
    const cfg: TableConfig<Row> = { ...baseCfg(), bodyRowCfg: { styleCfg: {} } };
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), cfg)).toEqual([]);
  });

  it('resolves the class hook per row, with null style', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { class: r => r.rowSrc.bold ? 'total not-hover' : null } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ class: 'total not-hover', style: null });
    expect(result[1]).toEqual({ class: null, style: null });
  });

  it('keeps the style hook result raw (un-built builder), with null class', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { style: r => r.rowSrc.bold ? StyleBuilder.Row.builder().fontWeight(StyleBuilder.FontWeight.BOLD) : '' } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result[0].class).toBeNull();
    expect(result[0].style instanceof StyleBuilder.Row).toBeTrue();
    expect((result[0].style as StyleBuilder.Row).build()).toContain('font-weight: bold;');
    expect(result[1].style).toBe('');
  });

  it('aligns result order/length with row.rowId', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { style: r => `color: c${r.rowId}` } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a' }, { name: 'b' }, { name: 'c' }), cfg);
    expect(result.length).toBe(3);
    expect(result[0].style).toBe('color: c0');
    expect(result[2].style).toBe('color: c2');
  });
});
