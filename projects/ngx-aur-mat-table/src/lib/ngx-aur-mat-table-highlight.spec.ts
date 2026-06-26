import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
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
    fixture.detectChanges();                    // firstChange -> seed
    expect(host.table.highlighted).toBe(host.data[0]);
    host.sel = host.data[1];
    fixture.detectChanges();                    // НЕ firstChange -> row-click игнорирует
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
