import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent, HighlightContainer } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { id: number; name: string; }

/** Базовый хост: дефолтный режим (row-click), single, + [highlight] для проверки развязки. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [highlight]="hl"
                   (expandedRowChange)="single.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class RowClickHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  single: (R | null)[] = [];
  hl: HighlightContainer<R> | undefined;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — row-click (default)', () => {
  let fixture: ComponentFixture<RowClickHostComponent>;
  let host: RowClickHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowClickHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RowClickHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('клик раскрывает строку и эмитит rowSrc', () => {
    mainRows()[0].click();
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
    expect(host.single).toEqual([host.data[0]]);
  });

  it('single = аккордеон: клик по другой строке закрывает первую', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    expect(markers()).toEqual(['b details']);
    expect(host.single).toEqual([host.data[0], host.data[1]]);
  });

  it('повторный клик по открытой строке сворачивает её и эмитит null', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual([]);
    expect(host.single).toEqual([host.data[0], null]);
  });

  it('[highlight] не раскрывает и не закрывает уже раскрытую деталь', () => {
    mainRows()[0].click(); fixture.detectChanges();   // раскрыта строка a
    host.hl = { value: host.data[1] };                // подсветить строку b
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);          // деталь a осталась, b не раскрылась
    expect(host.table.highlighted).toBe(host.data[1]); // highlight отработал
  });
});

/** Таблица БЕЗ extendedRowTemplate не должна запускать движок раскрытия при клике. */
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>`,
})
class NoTemplateHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: any[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }];
}

describe('NgxAurMatTable expanded rows — no template guard', () => {
  let fixture: ComponentFixture<NoTemplateHostComponent>;
  let host: NoTemplateHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [NoTemplateHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NoTemplateHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }

  it('клик по строке без [extendedRowTemplate] не эмитит expandedRowChange', () => {
    const row = mainRows()[0];
    row.click();
    fixture.detectChanges();
    expect(host.changes).toEqual([]);
  });
});

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   (expandedRowsChange)="multi.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class MultipleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  multi: R[][] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { multiple: true },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — multiple', () => {
  let fixture: ComponentFixture<MultipleHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MultipleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MultipleHostComponent);
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('две строки раскрыты одновременно; эмитит массив rowSrc', () => {
    const host = fixture.componentInstance;
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    expect(markers()).toEqual(['a details', 'b details']);
    expect(host.multi[host.multi.length - 1]).toEqual([host.data[0], host.data[1]]);
  });

  it('повторный клик закрывает только свою строку', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual(['b details']);
  });
});

/** Controlled: контейнер — источник правды, без авто-echo. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class ControlledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

/** Manual: только инпут, клик инертен. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class ManualHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'manual' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

/** multiple:false, но привязан [expandedRows] — dev-warning, активна пара [expandedRow]. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp" [expandedRows]="rows"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class MismatchHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  exp: R | null = null;
  rows: R[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class DisabledControlledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { enable: false } },
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

function markersOf(f: ComponentFixture<unknown>): string[] {
  return Array.from(f.nativeElement.querySelectorAll('.detail-marker'))
    .map(e => (e as HTMLElement).textContent!.trim());
}
function mainRowsOf(f: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(f.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
}

describe('NgxAurMatTable expanded rows — controlled', () => {
  let fixture: ComponentFixture<ControlledHostComponent>;
  let host: ControlledHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ControlledHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('инпут раскрывает строку', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
  });

  it('клик НЕ меняет DOM сам по себе, но эмитит запрос', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);            // нет echo — нет раскрытия
    expect(host.changes).toEqual([host.data[0]]);      // запрос ушёл
  });

  it('клик по уже раскрытой (через инпут) эмитит null', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(host.changes).toEqual([null]);
  });
});

describe('NgxAurMatTable expanded rows — manual', () => {
  let fixture: ComponentFixture<ManualHostComponent>;
  let host: ManualHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('инпут раскрывает', () => {
    host.exp = host.data[1];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['b details']);
  });

  it('клик не раскрывает и не эмитит', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);
    expect(host.changes).toEqual([]);
  });
});

describe('NgxAurMatTable expanded rows — mismatch warning', () => {
  it('multiple:false + [expandedRows] → warn, работает [expandedRow]', async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MismatchHostComponent],
    }).compileComponents();
    const warn = spyOn(console, 'warn');
    const fixture = TestBed.createComponent(MismatchHostComponent);
    const host = fixture.componentInstance;
    host.rows = [host.data[1]];      // в неактивной паре
    host.exp = host.data[0];         // активная пара
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
    expect(warn).toHaveBeenCalled();
  });
});

describe('NgxAurMatTable expanded rows — clickCfg.enable:false', () => {
  let fixture: ComponentFixture<DisabledControlledHostComponent>;
  let host: DisabledControlledHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DisabledControlledHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DisabledControlledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик по неинтерактивной строке не раскрывает и не эмитит', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);
    expect(host.changes).toEqual([]);
  });

  it('инпут раскрывает даже при enable:false', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
  });
});

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class TrackByHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    trackBy: r => r.id,
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — trackBy identity', () => {
  let fixture: ComponentFixture<TrackByHostComponent>;
  let host: TrackByHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TrackByHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackByHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('раскрытая строка остаётся раскрытой после пересоздания данных (reload)', () => {
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
    host.data = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];   // новые объекты, те же id
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
  });

  it('исчезнувшая строка выпадает из раскрытия', () => {
    mainRows()[0].click(); fixture.detectChanges();
    host.data = [{ id: 2, name: 'b' }];                          // строки id=1 больше нет
    fixture.detectChanges();
    expect(markers()).toEqual([]);
  });

  it('строка id=1 не воскресает раскрытой после удаления и повторного появления (prune)', () => {
    // Шаг 1: раскрыть строку id=1
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual(['a details']);

    // Шаг 2: убрать id=1 из данных — ключ должен быть удалён из _expanded (prune)
    host.data = [{ id: 2, name: 'b' }]; fixture.detectChanges();
    expect(markers()).toEqual([]);

    // Шаг 3: вернуть id=1 — WITHOUT prune ключ «1» остался бы в _expanded и строка
    // раскрылась бы снова; WITH remapExpandedToData ключ удалён → строка остаётся свёрнутой
    host.data = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]; fixture.detectChanges();
    expect(markers()).toEqual([]);
  });
});
