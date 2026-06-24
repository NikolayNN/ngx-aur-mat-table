import { RowActionProvider } from './RowActionProvider';
import { TableConfig } from '../model/ColumnConfig';
import { TableRow } from '../model/TableRow';

interface Row { name: string; }

function cfgOf(actionCfg: any): TableConfig<Row> {
  return { columnsCfg: [{ name: 'N', key: 'name', valueConverter: r => r.name }], actionCfg };
}

describe('RowActionProvider — мульти-колоночный (start/end)', () => {
  it('create → Dummy, когда actionCfg нет', () => {
    const p = RowActionProvider.create(cfgOf(undefined));
    expect(p.isEnabled).toBeFalse();
    expect(p.columns.length).toBe(0);
  });

  it('одиночный объект → одна колонка с именем tbl_actions', () => {
    const p = RowActionProvider.create(cfgOf({ actions: [] }));
    expect(p.columns.map(c => c.columnName)).toEqual(['tbl_actions']);
  });

  it('addActionColumns: end в порядке массива (справа)', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', position: 'end', actions: [] },
      { key: 'b', position: 'end', actions: [] },
    ]));
    const cols = ['name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['name', 'a', 'b']);
  });

  it('addActionColumns: start группой в порядке массива (слева)', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', position: 'start', actions: [] },
      { key: 'b', position: 'start', actions: [] },
    ]));
    const cols = ['name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['a', 'b', 'name']);
  });

  it('addActionColumns: не дублирует уже присутствующий ключ ([displayColumns])', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'a', position: 'end', actions: [] }]));
    const cols = ['a', 'name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['a', 'name']);
  });

  it('setView: actionView по rowId на каждую колонку', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'a', actions: [
      { action: () => 'edit', icon: { name: () => 'edit' } },
    ] }]));
    const rows = [{ id: 0, rowSrc: { name: 'x' } } as unknown as TableRow<Row>];
    p.setView(rows);
    expect(p.columns[0].actionView.get(0)!.length).toBe(1);
    expect(p.columns[0].actionView.get(0)![0].action).toBe('edit');
  });
});

describe('RowActionProvider — якоря (before/after)', () => {
  it('after вставляет после якоря (data-колонка)', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 't', position: { after: 'name' }, actions: [] }]));
    const cols = ['name', 'age'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 't', 'age']);
  });

  it('before вставляет перед якорём (спец-колонка)', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'm', position: { before: 'tbl_selects' }, actions: [] }]));
    const cols = ['name', 'tbl_selects'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'm', 'tbl_selects']);
  });

  it('цепочка: B after A, A after name', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'A', position: { after: 'name' }, actions: [] },
      { key: 'B', position: { after: 'A' }, actions: [] },
    ]));
    const cols = ['name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'A', 'B']);
  });

  it('якорь не найден → в конец + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'x', position: { after: 'missing' }, actions: [] }]));
    const cols = ['name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'x']);
    expect(warn).toHaveBeenCalled();
  });

  it('не дублирует уже присутствующий ключ ([displayColumns])', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'x', position: { after: 'name' }, actions: [] }]));
    const cols = ['x', 'name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['x', 'name']);
  });
});

describe('RowActionProvider — валидация ключей (dev-warn)', () => {
  it('дубль key → одна колонка + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', actions: [] }, { key: 'a', actions: [] },
    ]));
    expect(p.columns.map(c => c.columnName)).toEqual(['a']);
    expect(warn).toHaveBeenCalled();
  });

  it('коллизия с data-ключом → колонка отброшена + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'name', actions: [] }]));
    expect(p.columns.length).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it('коллизия с зарезервированным спец-именем (tbl_selects) → отброшена + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'tbl_selects', actions: [] }]));
    expect(p.columns.length).toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});
