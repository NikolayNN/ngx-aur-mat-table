import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';

interface TestData {
  name: string;
  age: number;
}

describe('NgxAurMatTableComponent display columns', () => {
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

    component.tableData = [{name: 'Alice', age: 30}];
    component.refreshTable();
  });

  it('should regenerate columns from columnsCfg when user did not set displayColumns', () => {
    expect(component._displayColumns.filter(c => !c.startsWith('tbl_'))).toEqual(['name', 'age']);

    // Add a new column to config and refresh
    component.tableConfig = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v: TestData) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v: TestData) => v.age},
        {name: 'City', key: 'city', valueConverter: () => 'NY'},
      ]
    };
    component.refreshTable();

    // Bug: _customDisplayColumnsEnabled is true from first refresh, so 'city' never appears
    expect(component._displayColumns.filter(c => !c.startsWith('tbl_'))).toEqual(['name', 'age', 'city']);
  });
});
