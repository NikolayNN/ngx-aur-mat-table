import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" (rowClick)="events.push($event)"></aur-mat-table>`,
})
class A11yHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  events: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { cancelable: true } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ReadOnlyHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable keyboard a11y (clickCfg задан)', () => {
  let fixture: ComponentFixture<A11yHostComponent>;
  let host: A11yHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [A11yHostComponent, ReadOnlyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(A11yHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
  }

  it('строки фокусируемы: tabindex="0"', () => {
    expect(rows()[0].getAttribute('tabindex')).toBe('0');
  });

  it('Enter активирует строку (rowClick) и ставит aria-current', () => {
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0]]);
    expect(rows()[0].getAttribute('aria-current')).toBe('true');
    expect(rows()[1].hasAttribute('aria-current')).toBeFalse();
  });

  it('Space активирует строку и подавляет скролл (preventDefault)', () => {
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows()[0].dispatchEvent(ev);
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0]]);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('keydown с вложенного элемента (td) игнорируется — клик строки не дублируется', () => {
    const cell = rows()[0].querySelector('td')!;
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([]);
  });

  it('повторный Enter при cancelable снимает выделение (эмитит undefined)', () => {
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0], undefined]);
    expect(rows()[0].hasAttribute('aria-current')).toBeFalse();
  });
});

describe('NgxAurMatTable keyboard a11y (без clickCfg)', () => {
  let fixture: ComponentFixture<ReadOnlyHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [A11yHostComponent, ReadOnlyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ReadOnlyHostComponent);
    fixture.detectChanges();
  });

  it('строки не фокусируемы: атрибута tabindex нет', () => {
    const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
    expect(row.hasAttribute('tabindex')).toBeFalse();
  });
});
