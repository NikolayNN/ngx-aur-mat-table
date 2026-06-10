import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PaddingHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: v => v.age,
        size: { paddingLeft: '10px', paddingRight: '12px' } },
    ],
    tableViewCfg: { cellPaddingLeft: '8px', cellPaddingRight: '9px' },
    headerButtonCfg: { icon: 'settings' },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class NoButtonHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable padding config', () => {
  let fixture: ComponentFixture<PaddingHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PaddingHostComponent, NoButtonHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PaddingHostComponent);
    fixture.detectChanges();
  });

  function tableEl(): HTMLElement {
    return fixture.nativeElement.querySelector('table');
  }

  it('tableViewCfg.cellPadding* выставляет переменные на <table>', () => {
    expect(tableEl().style.getPropertyValue('--aur-cell-padding-left')).toBe('8px');
    expect(tableEl().style.getPropertyValue('--aur-cell-padding-right')).toBe('9px');
  });

  it('size.padding* выставляет переменные на ячейках колонки (и только её)', () => {
    const tds = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td')) as HTMLElement[];
    // [0]=name, [1]=age
    expect(tds[1].style.getPropertyValue('--aur-cell-padding-left')).toBe('10px');
    expect(tds[1].style.getPropertyValue('--aur-cell-padding-right')).toBe('12px');
    expect(tds[0].style.getPropertyValue('--aur-cell-padding-left')).toBe('');
  });

  it('с headerButtonCfg таблица несёт класс aur-has-header-button', () => {
    expect(tableEl().classList.contains('aur-has-header-button')).toBeTrue();
  });

  it('без headerButtonCfg класса aur-has-header-button нет', () => {
    const f2 = TestBed.createComponent(NoButtonHostComponent);
    f2.detectChanges();
    const t2 = f2.nativeElement.querySelector('table') as HTMLElement;
    expect(t2.classList.contains('aur-has-header-button')).toBeFalse();
  });
});
