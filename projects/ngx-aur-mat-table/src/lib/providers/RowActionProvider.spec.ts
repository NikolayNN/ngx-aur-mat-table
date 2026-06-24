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
