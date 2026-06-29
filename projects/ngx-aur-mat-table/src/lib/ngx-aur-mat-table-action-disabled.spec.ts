import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; system: boolean; }

/** По кнопке (mat-icon-button) на строку тела; tooltip-вариант оборачивает кнопку в span, querySelector её всё равно находит. */
function rowButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'))
    .map(tr => (tr as HTMLElement).querySelector('button') as HTMLButtonElement);
}

// ---------- прямые действия ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class DirectActionHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  events: any[] = [];
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'edit',
          icon: { name: () => 'edit', tooltip: () => 'cannot edit' },
          disabled: row => row.system,
        },
      ],
    },
  };
  // row 0 system → disabled; row 1 → enabled
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('NgxAurMatTable action disabled (direct)', () => {
  let fixture: ComponentFixture<DirectActionHostComponent>;
  let host: DirectActionHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DirectActionHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DirectActionHostComponent);
    host = fixture.componentInstance;
  });

  it('disabled действие: кнопка disabled, клик не эмитит rowAction', () => {
    fixture.detectChanges();
    const row0Btn = rowButtons(fixture)[0];
    expect(row0Btn.disabled).toBeTrue();
    row0Btn.click();
    expect(host.events.length).toBe(0);
  });

  it('enabled действие: кнопка активна, клик эмитит rowAction', () => {
    fixture.detectChanges();
    const row1Btn = rowButtons(fixture)[1];
    expect(row1Btn.disabled).toBeFalse();
    row1Btn.click();
    expect(host.events.length).toBe(1);
    expect(host.events[0]).toEqual({ action: 'edit', value: { name: 'b', system: false } });
  });

  it('tooltip у disabled-кнопки висит на span-обёртке, не на самой кнопке', () => {
    fixture.detectChanges();
    const disabledSpan = fixture.debugElement.queryAll(By.directive(MatTooltip))
      .find(de => de.nativeElement.tagName === 'SPAN'
        && (de.nativeElement.querySelector('button') as HTMLButtonElement)?.disabled);
    expect(disabledSpan).withContext('span с matTooltip вокруг disabled-кнопки').toBeTruthy();
    expect(disabledSpan!.injector.get(MatTooltip).message).toBe('cannot edit');
  });
});

// ---------- кнопка-триггер меню ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class MenuActionHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert' },
          disabled: () => true,
          menu: [{ action: () => 'x', text: () => 'X' }],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: true }];
}

describe('NgxAurMatTable action disabled (menu trigger)', () => {
  let fixture: ComponentFixture<MenuActionHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MenuActionHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuActionHostComponent);
  });

  it('disabled кнопка-триггер: disabled, меню не открывается', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('tr.mat-mdc-row button') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
    btn.click();
    fixture.detectChanges();
    expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
  });
});

// ---------- disabled: нейтральный цвет иконки (Spec B) ----------

/** Все <mat-icon> в строках тела, в DOM-порядке. */
function rowIcons(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row mat-icon'));
}

@Component({
  selector: 'spec-disabled-color-direct-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorDirectHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'edit',
          icon: { name: () => 'edit', color: () => 'red' },
          disabled: row => row.system,
        },
      ],
    },
  };
  // row0 system → disabled (цвет должен сняться); row1 → enabled (цвет на месте)
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

@Component({
  selector: 'spec-disabled-color-menu-item-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorMenuItemHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert' },
          menu: [
            { action: () => 'copy', text: () => 'Copy',
              icon: { name: () => 'content_copy', color: () => 'blue' } },
            { action: () => 'archive', text: () => 'Archive',
              icon: { name: () => 'archive', color: () => 'blue' },
              disabled: () => true },
          ],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: false }];
}

@Component({
  selector: 'spec-disabled-color-trigger-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorTriggerHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert', color: () => 'blue' },
          disabled: () => true,
          menu: [{ action: () => 'x', text: () => 'X' }],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: false }];
}

describe('NgxAurMatTable action disabled — нейтральный цвет иконки', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [
        DisabledColorDirectHostComponent,
        DisabledColorMenuItemHostComponent,
        DisabledColorTriggerHostComponent,
      ],
    }).compileComponents();
  });

  it('прямое действие: при disabled inline-цвет снят, при enabled — сохранён', () => {
    const fixture = TestBed.createComponent(DisabledColorDirectHostComponent);
    fixture.detectChanges();
    const icons = rowIcons(fixture);
    expect(icons[0].style.color).toBe('');     // disabled → нейтральный (нет inline-цвета)
    expect(icons[1].style.color).toBe('red');  // enabled → цвет на месте
  });

  it('пункт меню: disabled-пункт без inline-цвета, enabled-пункт с цветом', () => {
    const fixture = TestBed.createComponent(DisabledColorMenuItemHostComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('tr.mat-mdc-row button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = Array.from(
      document.querySelectorAll('.mat-mdc-menu-panel button mat-icon')
    ) as HTMLElement[];
    expect(items[0].style.color).toBe('blue');  // enabled (copy)
    expect(items[1].style.color).toBe('');      // disabled (archive) → снят
  });

  it('кнопка-триггер меню: при disabled inline-цвет иконки триггера снят', () => {
    const fixture = TestBed.createComponent(DisabledColorTriggerHostComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('tr.mat-mdc-row mat-icon') as HTMLElement;
    expect(icon.style.color).toBe('');
  });
});
