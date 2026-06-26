import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { HighlightContainer } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { StyleBuilder } from './style-builder/style-builder';
import Row = StyleBuilder.Row;

interface R { name: string; }

/** Хост: highlightCfg.styleCfg задан И clickCfg.styleCfg задан — должен победить highlightCfg. */
@Component({
  standalone: false,
  selector: 'test-style-winner-host',
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StyleWinnerHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: {
      clickCfg: { styleCfg: { class: 'click-class', style: Row.builder().background('red') } },
      highlightCfg: { styleCfg: { class: 'hl-class', style: Row.builder().background('green') } },
    },
  };
  data: R[] = [{ name: 'a' }];
}

/** Хост: только clickCfg.styleCfg (legacy) — должен работать как fallback. */
@Component({
  standalone: false,
  selector: 'test-style-fallback-host',
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StyleFallbackHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { styleCfg: { class: 'click-class', style: Row.builder().background('red') } } },
  };
  data: R[] = [{ name: 'a' }];
}

@Component({
  standalone: false,
  selector: 'test-row-click-host',
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class RowClickHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'row-click', cancelable: false } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable highlight — row-click', () => {
  let fixture: ComponentFixture<RowClickHost>;
  let host: RowClickHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowClickHost],
    }).compileComponents();
    fixture = TestBed.createComponent(RowClickHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик подсвечивает, эмитит highlightedRowChange и rowClick', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBe(host.data[0]);
    expect(host.hlChanges).toEqual([host.data[0]]);
    expect(host.clicks).toEqual([host.data[0]]);
  });

  it('cancelable: повторный клик снимает подсветку, эмитит null / undefined', () => {
    host.cfg.bodyRowCfg!.highlightCfg!.cancelable = true;
    fixture.detectChanges();
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([host.data[0], null]);
    expect(host.clicks).toEqual([host.data[0], undefined]);
  });

  it('[highlightedRow] сидит состояние только на первом изменении (row-click владеет дальше)', () => {
    host.sel = host.data[0];
    fixture.detectChanges();                    // previousValue==null, currentValue!=null → seed
    expect(host.table.highlighted).toBe(host.data[0]);
    host.sel = host.data[1];
    fixture.detectChanges();                    // previousValue!=null → row-click игнорирует
    expect(host.table.highlighted).toBe(host.data[0]);
  });

  it('clickCfg.enable:false глушит клик (нет подсветки, нет эмитов)', () => {
    host.cfg.bodyRowCfg = { clickCfg: { enable: false }, highlightCfg: { mode: 'row-click' } };
    fixture.detectChanges();
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([]);
    expect(host.clicks).toEqual([]);
  });
});

/** Controlled: контейнер владеет; эхо highlightedRowChange -> sel замыкает [(highlightedRow)]. */
@Component({
  standalone: false,
  selector: 'test-controlled-host',
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="sel = $event; hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class ControlledHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'controlled', cancelable: true } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** Manual: клик не подсвечивает; только [highlightedRow] управляет подсветкой. */
@Component({
  standalone: false,
  selector: 'test-manual-host',
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class ManualHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'manual' } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable highlight — controlled', () => {
  let fixture: ComponentFixture<ControlledHost>;
  let host: ControlledHost;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ControlledHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlledHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик НЕ мутирует highlighted напрямую, а эмитит запрос; эхо замыкает цикл', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);            // эмит -> host.sel = data[0]
    expect(host.table.highlighted).toBeUndefined();   // controlled: клик не мутирует напрямую (до detectChanges)
    expect(host.hlChanges).toEqual([host.data[0]]);
    fixture.detectChanges();                    // authoritative sync из [highlightedRow]
    expect(host.table.highlighted).toBe(host.data[0]);
    expect(host.clicks).toEqual([host.data[0]]);
  });

  it('[highlightedRow] авторитетен на каждое изменение', () => {
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
    host.sel = null;
    fixture.detectChanges();
    expect(host.table.highlighted).toBeUndefined();
  });

  it('cancelable: повторный клик по подсвеченной эмитит null', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA); fixture.detectChanges();   // sel=data[0]
    host.table.handleRowClick(rowA); fixture.detectChanges();   // toggleOff -> null
    expect(host.hlChanges).toEqual([host.data[0], null]);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.clicks).toEqual([host.data[0], undefined]);
  });
});

describe('NgxAurMatTable highlight — manual', () => {
  let fixture: ComponentFixture<ManualHost>;
  let host: ManualHost;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик не подсвечивает и не эмитит highlightedRowChange, но rowClick летит', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([]);
    expect(host.clicks).toEqual([host.data[0]]);
  });

  it('только [highlightedRow] подсвечивает', () => {
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
  });
});

describe('NgxAurMatTable highlight — styling source', () => {
  function make<H>(type: new () => H): { fixture: ComponentFixture<H>; host: H } {
    const fixture = TestBed.createComponent(type);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, host };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [StyleWinnerHost, StyleFallbackHost],
    }).compileComponents();
  });

  it('highlightCfg.styleCfg побеждает clickCfg.styleCfg на подсвеченной строке', () => {
    const { host } = make(StyleWinnerHost);
    const [row] = host.table.tableDataSource.data;
    host.table.highlighted = row.rowSrc;
    expect(host.table.rowNgClass(row)['hl-class']).toBeTrue();
    expect(host.table.rowNgClass(row)['click-class']).toBeUndefined();
    expect(host.table.rowStyle(row)!).toContain('background: green;');
  });

  it('clickCfg.styleCfg работает как fallback при отсутствии highlightCfg.styleCfg', () => {
    const { host } = make(StyleFallbackHost);
    const [row] = host.table.tableDataSource.data;
    host.table.highlighted = row.rowSrc;
    expect(host.table.rowNgClass(row)['click-class']).toBeTrue();
    expect(host.table.rowStyle(row)!).toContain('background: red;');
  });
});

@Component({
  standalone: false,
  selector: 'test-conflict-host',
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlight]="legacy"
                   [highlightedRow]="sel"></aur-mat-table>
  `,
})
class ConflictHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  legacy: HighlightContainer<R> | undefined;
  sel: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'controlled' } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable highlight — депрекейты и конфликт', () => {
  let fixture: ComponentFixture<ConflictHost>;
  let host: ConflictHost;
  let warn: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ConflictHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ConflictHost);
    host = fixture.componentInstance;
    warn = spyOn(console, 'warn');
    fixture.detectChanges();
  });

  it('старый [highlight] всё ещё подсвечивает (back-compat) и предупреждает один раз', () => {
    host.legacy = { value: host.data[0] };
    fixture.detectChanges();
    host.legacy = { value: host.data[1] };
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
    expect(warn.calls.allArgs().filter(a => String(a[0]).includes('[highlight]')).length).toBe(1);
  });

  it('при обоих входах выигрывает [highlightedRow]', () => {
    host.legacy = { value: host.data[0] };
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
  });
});

describe('NgxAurMatTable highlight — fallback clickCfg предупреждает', () => {
  @Component({
    standalone: false,
    selector: 'test-legacy-click-host',
    template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
  })
  class LegacyClickHost {
    @ViewChild('t') table!: NgxAurMatTableComponent<R>;
    cfg: TableConfig<R> = {
      columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
      bodyRowCfg: { clickCfg: { cancelable: true, styleCfg: { class: 'click-class' } } },
    };
    data: R[] = [{ name: 'a' }];
  }

  let fixture: ComponentFixture<LegacyClickHost>;
  let host: LegacyClickHost;
  let warn: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [LegacyClickHost],
    }).compileComponents();
    fixture = TestBed.createComponent(LegacyClickHost);
    host = fixture.componentInstance;
    warn = spyOn(console, 'warn');
    fixture.detectChanges();
  });

  it('clickCfg.cancelable работает как fallback и предупреждает', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    host.table.handleRowClick(rowA);            // cancelable -> снимется
    expect(host.table.highlighted).toBeUndefined();
    expect(warn.calls.allArgs().some(a => String(a[0]).includes('clickCfg.cancelable'))).toBeTrue();
  });

  it('clickCfg.styleCfg работает как fallback и предупреждает', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.highlighted = rowA.rowSrc;
    expect(host.table.rowNgClass(rowA)['click-class']).toBeTrue();
    expect(warn.calls.allArgs().some(a => String(a[0]).includes('clickCfg.styleCfg'))).toBeTrue();
  });
});
