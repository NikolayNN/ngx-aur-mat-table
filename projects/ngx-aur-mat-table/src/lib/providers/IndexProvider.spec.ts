import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IndexProvider } from './IndexProvider';
import { NgxAurMatTableComponent } from '../ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from '../ngx-aur-mat-table.module';
import { TableConfig } from '../model/ColumnConfig';

describe('IndexProvider.format', () => {
  it('без форматтера возвращает строку с применённым offset', () => {
    const p = new IndexProvider({ offset: 1 });
    expect(p.format(0)).toBe('1');
  });

  it('применяет форматтер к индексу с уже применённым offset', () => {
    const p = new IndexProvider({ offset: 1, formatter: i => `${i}.` });
    expect(p.format(0)).toBe('1.');
  });

  it('без конфига: offset 0, без форматтера', () => {
    const p = new IndexProvider();
    expect(p.format(2)).toBe('2');
  });
});

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IndexFormatHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { enable: true, offset: 1, formatter: i => `${i}.` },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable index formatter (render)', () => {
  let fixture: ComponentFixture<IndexFormatHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IndexFormatHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IndexFormatHostComponent);
    fixture.detectChanges();
  });

  it('рендерит отформатированный индекс в ячейках', () => {
    const idxCells = fixture.nativeElement.querySelectorAll('tr[mat-row] td:first-child');
    expect((idxCells[0].textContent ?? '').trim()).toBe('1.');
    expect((idxCells[1].textContent ?? '').trim()).toBe('2.');
  });
});
