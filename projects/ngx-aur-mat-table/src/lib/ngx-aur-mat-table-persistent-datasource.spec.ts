import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {TableRow} from './model/TableRow';
import {NgxAurFilters} from './filters/NgxAurFilters';

interface TestData {
  name: string;
  age: number;
}

class AgeGreaterFilter extends NgxAurFilters.Base<TestData> {
  constructor(private minAge: number) {
    super();
  }

  filterFn(): (data: TableRow<TestData>) => boolean {
    return (data) => data['age'] > this.minAge;
  }

  equals(other: AgeGreaterFilter): boolean {
    return this.minAge === other.minAge;
  }
}

function searchEvent(value: string): Event {
  return {target: {value}} as unknown as Event;
}

describe('NgxAurMatTableComponent persistent datasource', () => {
  let component: NgxAurMatTableComponent<TestData>;

  beforeEach(() => {
    component = new NgxAurMatTableComponent<TestData>(
      {} as any,
      {markForCheck: () => {}} as any
    );

    component.tableConfig = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ]
    };

    component.tableData = [
      {name: 'Alice', age: 30},
      {name: 'Bob', age: 25},
      {name: 'Charlie', age: 35},
    ];

    component.refreshTable();
  });

  function filteredNames(): string[] {
    return component.tableDataSource.filteredData.map(r => r.rowSrc.name);
  }

  it('keeps the same MatTableDataSource instance across data updates', () => {
    const ds = component.tableDataSource;

    component.tableData = [{name: 'Dave', age: 40}];
    component.refreshTable();

    expect(component.tableDataSource).toBe(ds);
    expect(component.tableDataSource.data.map(r => r.rowSrc.name)).toEqual(['Dave']);
  });

  it('keeps programmatic filters applied after data update', () => {
    component.applyFilter('age', new AgeGreaterFilter(26));
    expect(filteredNames()).toEqual(['Alice', 'Charlie']);

    component.tableData = [
      {name: 'Dave', age: 20},
      {name: 'Eve', age: 50},
    ];
    component.refreshTable();

    expect(filteredNames()).toEqual(['Eve']);
  });

  it('keeps search filter applied after data update', () => {
    component.applySearchFilter(searchEvent('ali'));
    expect(filteredNames()).toEqual(['Alice']);

    component.tableData = [
      {name: 'Alina', age: 20},
      {name: 'Bob', age: 50},
    ];
    component.refreshTable();

    expect(filteredNames()).toEqual(['Alina']);
  });

  it('emits filtered (not full) rows in filterChange after data update', () => {
    component.applyFilter('age', new AgeGreaterFilter(26));

    const emitted: TestData[][] = [];
    component.filterChange.subscribe(rows => emitted.push(rows));

    component.tableData = [
      {name: 'Dave', age: 20},
      {name: 'Eve', age: 50},
    ];
    component.refreshTable();

    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1].map(r => r.name)).toEqual(['Eve']);
  });

  it('does not rebuild the datasource pipeline on repeated refreshes', () => {
    // _updateChangeSubscription дёргается сеттерами .paginator/.sort —
    // на повторных refresh с теми же значениями вызовов быть не должно
    expect(component.tableDataSource.paginator).toBeNull();
    const rebuildSpy = spyOn(component.tableDataSource as any, '_updateChangeSubscription').and.callThrough();

    component.refreshTable();
    component.refreshTable();

    expect(rebuildSpy).not.toHaveBeenCalled();
  });

  it('drops stale custom sort functions when config changes', () => {
    component.tableConfig = {
      columnsCfg: [
        {
          name: 'Name', key: 'name', valueConverter: (v) => v.name,
          sort: {enable: true, customSort: () => 0}
        },
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ]
    };
    component.refreshTable();
    const rowAlice = component.tableDataSource.data[0];
    expect(component.tableDataSource.sortingDataAccessor(rowAlice, 'name')).toBe(0);

    // конфиг без customSort: старая функция не должна применяться
    component.tableConfig = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ]
    };
    component.refreshTable();
    expect(component.tableDataSource.sortingDataAccessor(rowAlice, 'name')).toBe('Alice');
  });

  it('trackByRow returns rowSrc by default', () => {
    const row = component.tableDataSource.data[0];
    expect(component.trackByRow(0, row)).toBe(row.rowSrc);
  });

  it('trackByRow uses tableConfig.trackBy when provided', () => {
    component.tableConfig = {
      trackBy: item => item.name,
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ]
    };
    component.refreshTable();

    const row = component.tableDataSource.data[0];
    expect(component.trackByRow(0, row)).toBe('Alice');
  });

  it('master toggle selects only filtered rows after data update', () => {
    component.tableConfig = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ],
      selectionCfg: {enable: true, multiple: true}
    };
    component.refreshTable();

    component.applyFilter('age', new AgeGreaterFilter(26));
    component.tableData = [
      {name: 'Dave', age: 20},
      {name: 'Eve', age: 50},
      {name: 'Frank', age: 60},
    ];
    component.refreshTable();

    component.masterToggle();

    const selected = component.getSelectionModel().selected.map(s => s.name).sort();
    expect(selected).toEqual(['Eve', 'Frank']);
    expect(component.isAllSelected()).toBeTrue();
  });
});
