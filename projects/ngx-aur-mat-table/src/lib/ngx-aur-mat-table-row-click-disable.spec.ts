import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** clickCfg.enable: false — строка полностью неинтерактивна; с extendedRowTemplate для проверки раскрытия. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   (rowClick)="events.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class DisabledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  events: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { enable: false } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** clickCfg задан без enable — строка интерактивна (регрессия). */
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" (rowClick)="events.push($event)"></aur-mat-table>`,
})
class EnabledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  events: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: {} },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** Нет clickCfg вообще — мышиный клик по-прежнему эмитит (Group 2, регрессия). */
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" (rowClick)="events.push($event)"></aur-mat-table>`,
})
class BareHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  events: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable clickCfg.enable: false', () => {
  let fixture: ComponentFixture<DisabledHostComponent>;
  let host: DisabledHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DisabledHostComponent, EnabledHostComponent, BareHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DisabledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }

  it('клик не эмитит rowClick и не меняет внутренний highlight', () => {
    mainRows()[0].click();
    fixture.detectChanges();
    expect(host.events).toEqual([]);
    expect(host.table.highlighted).toBeUndefined();
    expect(mainRows()[0].hasAttribute('aria-current')).toBeFalse();
  });

  it('клик не раскрывает expanded-row (контент детали не вставлен)', () => {
    mainRows()[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detail-marker')).toBeNull();
  });

  it('строка не фокусируема: атрибута tabindex нет', () => {
    expect(mainRows()[0].hasAttribute('tabindex')).toBeFalse();
  });

  it('Enter не активирует строку (rowClick не эмитится)', () => {
    mainRows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([]);
  });

  it('регрессия: clickCfg без enable — клик эмитит, ставит aria-current и tabindex=0', () => {
    const ef = TestBed.createComponent(EnabledHostComponent);
    ef.detectChanges();
    const rows = Array.from(ef.nativeElement.querySelectorAll('tr[mat-row]')) as HTMLElement[];
    expect(rows[0].getAttribute('tabindex')).toBe('0');
    rows[0].click();
    ef.detectChanges();
    expect(ef.componentInstance.events).toEqual([ef.componentInstance.data[0]]);
    expect(rows[0].getAttribute('aria-current')).toBe('true');
  });

  it('регрессия: без clickCfg мышиный клик по-прежнему эмитит rowClick', () => {
    const bf = TestBed.createComponent(BareHostComponent);
    bf.detectChanges();
    const row = bf.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
    row.click();
    bf.detectChanges();
    expect(bf.componentInstance.events).toEqual([bf.componentInstance.data[0]]);
  });
});
