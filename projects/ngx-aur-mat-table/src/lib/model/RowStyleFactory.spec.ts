import {RowStyleFactory} from './RowStyleFactory';
import {TableRow} from './TableRow';
import {TableConfig} from './ColumnConfig';

interface Row { name: string; bold?: boolean; }

function rows(...data: Row[]): TableRow<Row>[] {
  return data.map((d, i) => new TableRow<Row>(i, d));
}

function baseCfg(): TableConfig<Row> {
  return { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
}

describe('RowStyleFactory', () => {

  it('returns [] when rowStyleCfg is absent', () => {
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), baseCfg())).toEqual([]);
  });

  it('returns [] when rowStyleCfg has neither class nor style', () => {
    const cfg: TableConfig<Row> = { ...baseCfg(), rowStyleCfg: {} };
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), cfg)).toEqual([]);
  });

  it('resolves the class hook per row, with empty style', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { class: r => r.rowSrc.bold ? 'total not-hover' : null },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ class: 'total not-hover', style: {} });
    expect(result[1]).toEqual({ class: null, style: {} });
  });

  it('resolves the style hook per row (incl. fontWeight), with null class', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { style: r => r.rowSrc.bold ? { fontWeight: 'bold' } : {} },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result[0]).toEqual({ class: null, style: { fontWeight: 'bold' } });
    expect(result[1]).toEqual({ class: null, style: {} });
  });

  it('aligns result order/length with row.id', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { style: r => ({ color: 'c' + r.id }) },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a' }, { name: 'b' }, { name: 'c' }), cfg);
    expect(result.length).toBe(3);
    expect(result[0].style.color).toBe('c0');
    expect(result[2].style.color).toBe('c2');
  });
});
