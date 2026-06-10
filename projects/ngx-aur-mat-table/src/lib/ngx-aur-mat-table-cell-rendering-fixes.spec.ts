import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row {
  name: string;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class IndexNameHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{key: 'name', name: 'Name', valueConverter: v => v.name}],
    indexCfg: {enable: true, name: 'NN', offset: 1},
  };
  data: Row[] = [{name: 'a'}];
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class IconWrapperHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: {icon: {name: () => 'home', wrapper: {color: () => 'red'}}}
    }],
  };
  data: Row[] = [{name: 'a'}];
}

describe('NgxAurMatTable index header name', () => {
  let fixture: ComponentFixture<IndexNameHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IndexNameHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IndexNameHostComponent);
  });

  it('renders indexCfg.name in the index column header', () => {
    fixture.detectChanges();
    const headers = Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell')) as HTMLElement[];
    expect(headers.map(th => th.textContent!.trim())).toEqual(['NN', 'Name']);
  });

  it('renders index cells with the configured offset', () => {
    fixture.detectChanges();
    const firstCell = fixture.nativeElement.querySelector('tr.mat-mdc-row td.mat-mdc-cell') as HTMLElement;
    expect(firstCell.textContent!.trim()).toBe('1'); // id 0 + offset 1
  });
});

describe('NgxAurMatTable icon wrapper circle', () => {
  let fixture: ComponentFixture<IconWrapperHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconWrapperHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconWrapperHostComponent);
  });

  it('applies the circle size and rounding to the icon wrapper', () => {
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('td lib-icon-view div.circle') as HTMLElement;
    expect(circle).withContext('div.circle должен рендериться при заданном wrapper').not.toBeNull();

    const style = getComputedStyle(circle);
    expect(style.borderRadius).toBe('50%');
    expect(style.height).toBe('28px');
    expect(circle.style.backgroundColor).toBe('red'); // инлайн от [style.background-color]
  });
});
