import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Раскрытие через директиву ngxAurExpandedRowDef + обогащённый контекст. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef let-rowSrc let-row="row" let-i="index">
        <span class="d">{{ rowSrc.name }}|{{ row.rowSrc.name }}|{{ i }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class ExpandedDefHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** Две директивы → dev-warn, берётся первая. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef><span class="first">FIRST</span></ng-template>
      <ng-template ngxAurExpandedRowDef><span class="second">SECOND</span></ng-template>
    </aur-mat-table>
  `,
})
class DuplicateDefHost {
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }];
}

describe('ngxAurExpandedRowDef', () => {
  function rows(fixture: ComponentFixture<any>): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }

  it('доставляет detail-шаблон и обогащённый контекст ($implicit=rowSrc, row=wrapper, index=id)', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExpandedDefHost],
    });
    const fixture = TestBed.createComponent(ExpandedDefHost);
    fixture.detectChanges();
    rows(fixture)[0].click();
    fixture.detectChanges();
    const d = fixture.nativeElement.querySelector('.d') as HTMLElement;
    expect(d.textContent!.trim()).toBe('a|a|0');
  });

  it('multiTemplateDataRows включён: detail-строка существует в разметке', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExpandedDefHost],
    });
    const fixture = TestBed.createComponent(ExpandedDefHost);
    fixture.detectChanges();
    expect(fixture.componentInstance.table.expandedRowTemplate).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(2);
  });

  it('две директивы → dev-warn, рендерится первая', () => {
    const warn = spyOn(console, 'warn');
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DuplicateDefHost],
    });
    const fixture = TestBed.createComponent(DuplicateDefHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('tr[mat-row]:not(.expanded-row)') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.first')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.second')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
