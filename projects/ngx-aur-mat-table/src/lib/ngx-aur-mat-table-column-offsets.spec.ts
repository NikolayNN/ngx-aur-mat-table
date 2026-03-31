import {NgxAurMatTableComponent, ColumnOffset} from './ngx-aur-mat-table.component';

describe('NgxAurMatTableComponent updateColumnOffsets', () => {
  let component: NgxAurMatTableComponent<any>;

  beforeEach(() => {
    component = new NgxAurMatTableComponent({} as any, {markForCheck: () => {}} as any);
    component._displayColumns = ['col1', 'col2', 'col3'];
  });

  it('should emit only _displayColumns.length offsets when extra header rows exist', () => {
    // 6 th elements: simulates main row (3) + extra header row (3)
    const thElements = [
      {offsetLeft: 0, offsetWidth: 100},
      {offsetLeft: 100, offsetWidth: 80},
      {offsetLeft: 180, offsetWidth: 120},
      {offsetLeft: 0, offsetWidth: 100},
      {offsetLeft: 100, offsetWidth: 80},
      {offsetLeft: 180, offsetWidth: 120},
    ];

    component.table = {
      nativeElement: {querySelectorAll: () => thElements}
    } as any;

    let emitted: ColumnOffset[] | undefined;
    component.columnOffsets.subscribe(v => emitted = v);

    component.ngAfterViewChecked();

    expect(emitted).toBeDefined();
    expect(emitted!.length).toBe(3);
    expect(emitted!.map(o => o.key)).toEqual(['col1', 'col2', 'col3']);
    expect(emitted!.every(o => o.key !== undefined)).toBeTrue();
  });
});
