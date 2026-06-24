import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Кнопки действий первой строки тела. */
function row0Buttons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  const tr = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;
  return Array.from(tr.querySelectorAll('button')) as HTMLButtonElement[];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  events: any[] = [];
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: Row[] = [{ name: 'a' }];
}

describe('NgxAurMatTable — несколько action-колонок', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('back-compat: одиночный объект → одна колонка, клик эмитит', () => {
    host.cfg = { ...host.cfg, actionCfg: { actions: [
      { action: () => 'edit', icon: { name: () => 'edit' } },
    ] } } as any;
    fixture.detectChanges();
    const btns = row0Buttons(fixture);
    expect(btns.length).toBe(1);
    btns[0].click();
    expect(host.events).toEqual([{ action: 'edit', value: { name: 'a' } }]);
  });

  it('массив start+end → две колонки; обе кликаются', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'start', actions: [{ action: () => 'edit', icon: { name: () => 'edit' } }] },
      { key: 'm', position: 'end', actions: [{ action: () => 'del', icon: { name: () => 'delete' } }] },
    ] } as any;
    fixture.detectChanges();
    const btns = row0Buttons(fixture);
    expect(btns.length).toBe(2);
    expect(host.table._displayColumns).toEqual(['p', 'name', 'm']);
    btns.forEach(b => b.click());
    expect(host.events.map(e => e.action).sort()).toEqual(['del', 'edit']);
  });

  it('disabled-колонка (enable:false) не рендерится', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'end', actions: [{ action: () => 'edit', icon: { name: () => 'edit' } }] },
      { key: 'm', enable: false, position: 'end', actions: [{ action: () => 'del', icon: { name: () => 'delete' } }] },
    ] } as any;
    fixture.detectChanges();
    expect(host.table._displayColumns).toEqual(['name', 'p']);
    expect(row0Buttons(fixture).length).toBe(1);
  });

  it('независимый size: ширина применяется на нужную колонку', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'end', size: { width: '123px' }, actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] },
    ] } as any;
    fixture.detectChanges();
    const th = fixture.nativeElement.querySelector('th.mat-column-p') as HTMLElement;
    expect(th.style.width).toBe('123px');
  });

  // Unit-стиль (как display-columns.spec): displayColumns задаётся ДО первого CD,
  // поэтому работаем с компонентом напрямую, а не через @ViewChild (он ещё не разрешён).
  it('[displayColumns] с action-ключом → позиция ручная (провайдер не двигает)', () => {
    const c = new NgxAurMatTableComponent<Row>({} as any, { markForCheck: () => {} } as any);
    c.tableConfig = {
      columnsCfg: [{ key: 'name', name: 'Name', valueConverter: (v: Row) => v.name }],
      actionCfg: [{ key: 'p', position: 'end', actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] }],
    } as any;
    c.tableData = [{ name: 'a' }];
    c.displayColumns = ['p', 'name'];
    c.refreshTable();
    expect(c._displayColumns).toEqual(['p', 'name']);
  });

  it('якорь {after:name} ставит колонку сразу после data-колонки (сквозь refreshTable)', () => {
    host.cfg = {
      columnsCfg: [
        { key: 'name', name: 'Name', valueConverter: (v: any) => v.name },
        { key: 'age', name: 'Age', valueConverter: (v: any) => v.age },
      ],
      actionCfg: [
        { key: 't', position: { after: 'name' }, actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] },
      ],
    } as any;
    fixture.detectChanges();
    expect(host.table._displayColumns).toEqual(['name', 't', 'age']);
  });
});
