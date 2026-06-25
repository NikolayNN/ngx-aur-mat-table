import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row { id: number; status: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IdColumnHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [
      {key: 'id', name: 'ID', valueConverter: v => v.id, valueView: {icon: {name: () => 'flag'}}},
      {key: 'status', name: 'Status', valueConverter: v => v.status},
    ],
  };
  // business ids: 23 out of the row-index range [0..3]; 3/2/1 fall inside it (reproduces the screenshot)
  data: Row[] = [{id: 23, status: 'RUN'}, {id: 3, status: 'RUN'}, {id: 2, status: 'RUN'}, {id: 1, status: 'RUN'}];
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ReservedKeyHostComponent {
  cfg: TableConfig<any> = { columnsCfg: [{key: 'rowId', name: 'X', valueConverter: (v: any) => v.x}] };
  data: any[] = [{x: 1}];
}

describe('NgxAurMatTable rowId collision — reserved-key guard', () => {
  function renderWith(key: string): () => void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ReservedKeyHostComponent],
    });
    const fixture = TestBed.createComponent(ReservedKeyHostComponent);
    fixture.componentInstance.cfg = {columnsCfg: [{key, name: 'X', valueConverter: (v: any) => v.x}]};
    return () => fixture.detectChanges();
  }

  it('throws when a column key is "rowId"', () => {
    expect(renderWith('rowId')).toThrowError(/конфликтует со служебным полем/);
  });

  it('throws when a column key is "rowSrc"', () => {
    expect(renderWith('rowSrc')).toThrowError(/конфликтует со служебным полем/);
  });
});

describe('NgxAurMatTable rowId collision — valueView with column key "id"', () => {
  let fixture: ComponentFixture<IdColumnHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IdColumnHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IdColumnHostComponent);
  });

  function idCells(): HTMLElement[] {
    // id column is the first column → first cell of each body row
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td.mat-mdc-cell:first-child'));
  }

  it('renders the valueView icon for EVERY row, including business ids outside the index range', () => {
    fixture.detectChanges();
    const cells = idCells();
    expect(cells.length).toBe(4);
    const ids = [23, 3, 2, 1];
    cells.forEach((cell, i) =>
      expect(cell.querySelector('lib-column-view mat-icon'))
        .withContext(`строка ${i} (бизнес-id ${ids[i]}) должна показывать иконку, а не голый текст`)
        .not.toBeNull());
  });
});
