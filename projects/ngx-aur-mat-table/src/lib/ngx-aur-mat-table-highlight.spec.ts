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
