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

describe('NgxAurMatTableComponent filtering', () => {
  let component: NgxAurMatTableComponent<TestData>;

  beforeEach(() => {
    component = new NgxAurMatTableComponent(
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

  it('should keep search active after applying programmatic filter', () => {
    component.applySearchFilter(searchEvent('ali'));
    expect(filteredNames()).toEqual(['Alice']);

    component.applyFilter('age', new AgeGreaterFilter(26));
    // Bug: search lost → ['Alice', 'Charlie']. Fix: both active → ['Alice']
    expect(filteredNames()).toEqual(['Alice']);
  });

  it('should apply search when programmatic filter is already active', () => {
    component.applyFilter('age', new AgeGreaterFilter(26));
    expect(filteredNames()).toEqual(['Alice', 'Charlie']);

    component.applySearchFilter(searchEvent('ali'));
    // Bug: search ignored → ['Alice', 'Charlie']. Fix: both active → ['Alice']
    expect(filteredNames()).toEqual(['Alice']);
  });

  it('should keep search active after clearing programmatic filters', () => {
    component.applySearchFilter(searchEvent('ali'));
    component.applyFilter('age', new AgeGreaterFilter(26));

    component.clearFilters();
    // Bug: all filters lost → ['Alice', 'Bob', 'Charlie']. Fix: search stays → ['Alice']
    expect(filteredNames()).toEqual(['Alice']);
  });

  // Поиск должен идти ТОЛЬКО по значениям колонок — не по служебным полям TableRow
  it('search does not match the internal row id', () => {
    // '1' встречается только во внутреннем id строки Bob (id=1); в значениях колонок цифры 1 нет
    component.applySearchFilter(searchEvent('1'));
    expect(filteredNames()).toEqual([]);
  });

  it('search does not match the rowSrc object placeholder', () => {
    // дефолтный предикат Material конкатенирует rowSrc как "[object Object]"
    component.applySearchFilter(searchEvent('object'));
    expect(filteredNames()).toEqual([]);
  });

  it('search still matches values across all configured columns', () => {
    component.applySearchFilter(searchEvent('25'));
    expect(filteredNames()).toEqual(['Bob']);

    component.applySearchFilter(searchEvent('ali'));
    expect(filteredNames()).toEqual(['Alice']);
  });
});
