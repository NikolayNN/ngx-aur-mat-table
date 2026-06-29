import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { PaginatorState } from './model/PaginatorState';

interface Row { name: string; }

/** 20 rows of an already-fetched server page (page index varies in the test). */
function pageRows(): Row[] {
  return Array.from({ length: 20 }, (_, i) => ({ name: 'r' + i }));
}

function renderedNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td'))
    .map(td => (td as HTMLElement).textContent!.trim());
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data" [paginatorState]="state"
                   (pageChange)="onPage($event)" (sort)="sortCalls = sortCalls + 1">
    </aur-mat-table>`,
})
class ManualServerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, sort: {} }],
    paginationCfg: { enable: true, size: 20, mode: 'server' },
  };
  data: Row[] = pageRows();
  state = PaginatorState.of({ total: 200, pageIndex: 0 });
  pageEvents: PageEvent[] = [];
  sortCalls = 0;
  onPage(e: PageEvent) { this.pageEvents.push(e); }
}

describe('NgxAurMatTable manual server pagination (mode:server, no pageSource)', () => {
  let fixture: ComponentFixture<ManualServerHostComponent>;
  let host: ManualServerHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualServerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualServerHostComponent);
    host = fixture.componentInstance;
  });

  it('does not bind the data source paginator or sort', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.table.tableDataSource.paginator).toBeNull();
    expect(host.table.tableDataSource.sort).toBeNull();
  }));

  it('renders all 20 provided rows on page index 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture).length).toBe(20);
  }));

  it('renders all 20 provided rows on page index 1 (no re-slice of the server page)', fakeAsync(() => {
    host.state = PaginatorState.of({ total: 200, pageIndex: 1 });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    // The bug: client paginator slices data.slice(20,40) of a 20-row array → empty / reset.
    expect(renderedNames(fixture).length).toBe(20);
  }));

  it('emits (pageChange) and does not auto-load (data stays as provided)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const before = host.table.tableDataSource.data.length;
    host.table.onPageChangeInternal({ pageIndex: 1, pageSize: 20, previousPageIndex: 0, length: 200 });
    tick();
    expect(host.pageEvents.length).toBe(1);
    expect(host.pageEvents[0].pageIndex).toBe(1);
    // no pageSource → table did not replace data on its own
    expect(host.table.tableDataSource.data.length).toBe(before);
  }));
});
