import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; system?: boolean; vip?: boolean; }

function bodyRows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
}

// ---------- pointer per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PointerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { pointer: row => !row.rowSrc.system } },
  };
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('conditional row style: pointer per-row', () => {
  let fixture: ComponentFixture<PointerHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PointerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PointerHostComponent);
  });

  it('системная строка без класса pointer, обычная — с ним', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);
    expect(r0.classList.contains('pointer')).withContext('system row').toBeFalse();
    expect(r1.classList.contains('pointer')).withContext('обычная row').toBeTrue();
  });
});

// ---------- hover style per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HoverStyleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { styleCfg: { style: row => row.rowSrc.system ? '' : 'color: red' } } },
  };
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('conditional row style: hover style per-row', () => {
  let fixture: ComponentFixture<HoverStyleHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HoverStyleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HoverStyleHostComponent);
  });

  it('mouseenter: обычная строка → color red, системная → пусто', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);

    r1.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r1.style.color).toBe('red');

    r1.dispatchEvent(new MouseEvent('mouseleave'));
    r0.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r0.style.color).toBe(''); // system → ''
  });
});

// ---------- click style per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClickStyleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { styleCfg: { style: row => 'color: ' + (row.rowSrc.vip ? 'gold' : 'gray') } } },
  };
  data: Row[] = [{ name: 'a', vip: true }, { name: 'b', vip: false }];
}

describe('conditional row style: click style per-row', () => {
  let fixture: ComponentFixture<ClickStyleHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClickStyleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClickStyleHostComponent);
  });

  it('клик по vip-строке → gold; по обычной → gray', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);

    r0.click(); // vip
    fixture.detectChanges();
    expect(r0.style.color).toBe('gold');

    r1.click(); // обычная
    fixture.detectChanges();
    expect(r1.style.color).toBe('gray');
  });
});

// ---------- регрессия: статичный pointer ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StaticPointerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { pointer: true } },
  };
  data: Row[] = [{ name: 'a' }, { name: 'b' }];
}

describe('conditional row style: статичный pointer (регрессия)', () => {
  let fixture: ComponentFixture<StaticPointerHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [StaticPointerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StaticPointerHostComponent);
  });

  it('pointer: true → класс pointer на всех строках', () => {
    fixture.detectChanges();
    bodyRows(fixture).forEach(r => expect(r.classList.contains('pointer')).toBeTrue());
  });
});

// ---------- hover class per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HoverClassHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { styleCfg: { class: row => row.rowSrc.system ? null : 'hov' } } },
  };
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('conditional row style: hover class per-row', () => {
  let fixture: ComponentFixture<HoverClassHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HoverClassHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HoverClassHostComponent);
  });

  it('mouseenter: обычная строка → класс hov, системная → нет', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);

    r1.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r1.classList.contains('hov')).toBeTrue();

    r1.dispatchEvent(new MouseEvent('mouseleave'));
    r0.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r0.classList.contains('hov')).toBeFalse(); // system → null
  });
});
