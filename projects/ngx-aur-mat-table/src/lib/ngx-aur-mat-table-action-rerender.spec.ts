import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Rule { id: number; enabled: boolean; }

/** Все кнопки в строках тела (в этих тестах других кнопок в строках нет → это action-кнопки). */
function bodyButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row button'));
}

/** Тексты <mat-icon> в строках тела, в DOM-порядке. */
function bodyIconNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row mat-icon'))
    .map(el => (el as HTMLElement).textContent!.trim());
}

// #1 — действие со свойствами, зависящими от состояния строки
@Component({
  selector: 'spec-dynamic-action-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class DynamicActionHostComponent {
  events: any[] = [];
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: {
      actions: [{
        action: r => (r.enabled ? 'disable' : 'enable'),
        icon: {
          name: r => (r.enabled ? 'toggle_on' : 'toggle_off'),
          color: r => (r.enabled ? 'green' : 'gray'),
        },
      }],
    },
  };
  data: Rule[] = [{ id: 1, enabled: false }];
}

// #3 — первый рендер с пустыми данными, затем async-непустой массив
@Component({
  selector: 'spec-async-first-load-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class AsyncFirstLoadHostComponent {
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: {
      actions: [
        { action: () => 'edit', icon: { name: () => 'edit' } },
        { action: () => 'delete', icon: { name: () => 'delete' } },
      ],
    },
  };
  data: Rule[] = [];
}

// Несколько action-колонок
@Component({
  selector: 'spec-multi-action-column-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class MultiActionColumnHostComponent {
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: [
      { key: 'tbl_toggle', actions: [{ action: () => 't', icon: { name: r => (r.enabled ? 'toggle_on' : 'toggle_off') } }] },
      { key: 'tbl_star', actions: [{ action: () => 's', icon: { name: r => (r.enabled ? 'star' : 'star_border') } }] },
    ],
  };
  data: Rule[] = [{ id: 1, enabled: false }];
}

describe('NgxAurMatTable action re-render (trackBy)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DynamicActionHostComponent, AsyncFirstLoadHostComponent, MultiActionColumnHostComponent],
    }).compileComponents();
  });

  it('#1 иконка/цвет/код действия пересчитываются при смене [tableData] новым объектом', () => {
    const fixture = TestBed.createComponent(DynamicActionHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyIconNames(fixture)).toEqual(['toggle_off']);

    host.data = [{ id: 1, enabled: true }];   // REST вернул новый массив с новым объектом
    fixture.detectChanges();

    expect(bodyIconNames(fixture)).toEqual(['toggle_on']);
    const icon = fixture.nativeElement.querySelector('tr.mat-mdc-row mat-icon') as HTMLElement;
    expect(icon.style.color).toBe('green');

    bodyButtons(fixture)[0].click();
    expect(host.events[host.events.length - 1]).toEqual({ action: 'disable', value: { id: 1, enabled: true } });
  });

  it('#3 action-кнопки появляются, когда непустой [tableData] приходит после пустого первого рендера', () => {
    const fixture = TestBed.createComponent(AsyncFirstLoadHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyButtons(fixture).length).toBe(0);

    host.data = [{ id: 1, enabled: false }, { id: 2, enabled: false }, { id: 3, enabled: false }];
    fixture.detectChanges();

    expect(bodyButtons(fixture).length).toBe(6);   // 3 строки × 2 действия
  });

  it('несколько action-колонок: обе пересчитываются при смене [tableData]', () => {
    const fixture = TestBed.createComponent(MultiActionColumnHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyIconNames(fixture)).toEqual(['toggle_off', 'star_border']);

    host.data = [{ id: 1, enabled: true }];
    fixture.detectChanges();

    expect(bodyIconNames(fixture)).toEqual(['toggle_on', 'star']);
  });
});
