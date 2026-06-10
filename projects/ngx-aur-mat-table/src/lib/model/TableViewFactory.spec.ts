import {TableViewFactory} from './TableViewFactory';
import {TableRow} from './TableRow';
import {TableConfig} from './ColumnConfig';

interface TestData {
  name: string;
}

function rows(count: number): TableRow<TestData>[] {
  return Array.from({length: count}, (_, i) => {
    const row = new TableRow<TestData>(i, {name: 'n' + i});
    row['name'] = 'n' + i;
    return row;
  });
}

describe('TableViewFactory', () => {

  it('returns an empty array when no column defines valueView (no per-row garbage)', () => {
    const cfg: TableConfig<TestData> = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: v => v.name},
      ]
    };

    expect(TableViewFactory.toView(rows(20), cfg)).toEqual([]);
  });

  it('builds a per-row map with resolved views when valueView is configured', () => {
    const cfg: TableConfig<TestData> = {
      columnsCfg: [
        {
          name: 'Name', key: 'name', valueConverter: v => v.name,
          valueView: {icon: {name: row => 'icon-' + row.rowSrc.name}}
        },
      ]
    };

    const view = TableViewFactory.toView(rows(2), cfg);

    expect(view.length).toBe(2);
    expect(view[0].get('name')?.icon?.name).toBe('icon-n0');
    expect(view[1].get('name')?.icon?.name).toBe('icon-n1');
  });
});
