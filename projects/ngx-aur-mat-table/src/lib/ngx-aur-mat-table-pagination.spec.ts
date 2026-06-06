import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AurPage, AurPageRequest, AurPageSource } from './model/AurPage';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

interface Row { name: string; }

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"
                   (loadingChange)="loading = $event"></aur-mat-table>`
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  loading = false;
  calls: AurPageRequest[] = [];
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    paginationCfg: { enable: true, size: 10, mode: 'server' },
  };
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    const page: AurPage<Row> = { content: [{ name: 'a' }], totalElements: 42, number: req.pageIndex };
    return of(page);
  };
}

describe('NgxAurMatTable server pagination', () => {
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

  it('loads the first page automatically when pageSource is set', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit
    tick();
    expect(host.calls.length).toBe(1);
    expect(host.calls[0].pageIndex).toBe(0);
    expect(host.table.paginatorState?.length).toBe(42);
  }));

  it('emits loadingChange around the fetch', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    // with synchronous of(), loading toggled true then false
    expect(host.loading).toBeFalse();
  }));

  it('reload() re-invokes pageSource from page 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    host.table.reload();
    tick();
    expect(host.calls.length).toBe(2);
    expect(host.calls[1].pageIndex).toBe(0);
  }));
});

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"
                   [externalPaginator]="pg"></aur-mat-table>
    <mat-paginator #pg [pageSizeOptions]="[10]"></mat-paginator>`
})
class ExternalHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  @ViewChild('pg') pg!: MatPaginator;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    paginationCfg: { enable: true, size: 10, mode: 'server' },
  };
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }], totalElements: 99, number: req.pageIndex } as AurPage<Row>);
}

describe('NgxAurMatTable external paginator (server)', () => {
  let fixture: ComponentFixture<ExternalHostComponent>;
  let host: ExternalHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, MatPaginatorModule, NoopAnimationsModule],
      declarations: [ExternalHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExternalHostComponent);
    host = fixture.componentInstance;
  });

  it('pushes length/pageIndex onto the external paginator and it renders them', fakeAsync(() => {
    fixture.detectChanges(); // host create + child ngAfterViewInit
    tick();
    fixture.detectChanges(); // external paginator ref propagates via ngOnChanges; state applied
    tick();
    fixture.detectChanges(); // render range label

    // state pushed onto the external paginator instance
    expect(host.pg.length).toBe(99);
    expect(host.pg.pageIndex).toBe(0);

    // and it actually RENDERS the total (range label reflects 99) — gates real CD, not just property set
    const rangeLabel: HTMLElement | null =
      fixture.nativeElement.querySelector('.mat-mdc-paginator-range-label');
    expect(rangeLabel).withContext('range label element should exist').toBeTruthy();
    expect(rangeLabel!.textContent).withContext('range label should show the server total 99').toContain('99');
  }));

  it('does not render the built-in paginator when externalPaginator is provided', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    // Only the host's own <mat-paginator #pg> exists — the table did not render its own.
    const paginators = fixture.nativeElement.querySelectorAll('mat-paginator');
    expect(paginators.length).toBe(1);
  }));
});

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data" [externalPaginator]="pg"></aur-mat-table>
    <mat-paginator #pg [pageSizeOptions]="[5, 10]" [pageSize]="5"></mat-paginator>`
})
class ExternalClientHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  @ViewChild('pg') pg!: MatPaginator;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    paginationCfg: { enable: true, size: 5 }, // client data, no mode/pageSource
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('NgxAurMatTable external paginator (client)', () => {
  let fixture: ComponentFixture<ExternalClientHostComponent>;
  let host: ExternalClientHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, MatPaginatorModule, NoopAnimationsModule],
      declarations: [ExternalClientHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExternalClientHostComponent);
    host = fixture.componentInstance;
  });

  it('binds the external paginator to the data source and hides the built-in one', fakeAsync(() => {
    fixture.detectChanges(); // create + child ngAfterViewInit (external not yet resolved)
    tick();
    fixture.detectChanges(); // external paginator ref propagates via ngOnChanges
    tick();
    fixture.detectChanges();

    // activePaginator resolves to the external instance
    expect(host.table.activePaginator).toBe(host.pg);
    // data source is sliced through the external paginator
    expect(host.table.tableDataSource.paginator).toBe(host.pg);
    // built-in paginator is not rendered (only the host's own <mat-paginator> exists)
    const paginators = fixture.nativeElement.querySelectorAll('mat-paginator');
    expect(paginators.length).toBe(1);
  }));
});
