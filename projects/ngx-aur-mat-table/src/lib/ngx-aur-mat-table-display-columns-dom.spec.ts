import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row {
  name: string;
  age: number;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data" [displayColumns]="displayColumns"></aur-mat-table>`
})
class ColumnsHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [
      {key: 'name', name: 'Name', valueConverter: v => v.name},
      {key: 'age', name: 'Age', valueConverter: v => v.age},
    ],
  };
  data: Row[] = [{name: 'a', age: 1}, {name: 'b', age: 2}];
  displayColumns: string[] = [];
}

describe('NgxAurMatTable displayColumns DOM', () => {
  let fixture: ComponentFixture<ColumnsHostComponent>;
  let host: ColumnsHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ColumnsHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ColumnsHostComponent);
    host = fixture.componentInstance;
  });

  function headerTexts(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'))
      .map((th: any) => (th.textContent as string).trim());
  }

  it('hides a column when displayColumns receives a new array reference', () => {
    fixture.detectChanges();
    expect(headerTexts()).toEqual(['Name', 'Age']);

    // новая ссылка на массив обязательна: ngOnChanges не видит мутаций на месте
    host.displayColumns = ['name'];
    fixture.detectChanges();

    expect(headerTexts()).toEqual(['Name']);
  });
});
