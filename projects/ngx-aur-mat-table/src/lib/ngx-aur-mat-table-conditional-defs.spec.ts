import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row {
  name: string;
}

function cfg(): TableConfig<Row> {
  return {
    columnsCfg: [{key: 'name', name: 'Name', valueConverter: v => v.name}],
  };
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data"
                   [extraHeaderCellTopTemplate]="top"
                   [extraHeaderCellBottomTemplate]="bottom"></aur-mat-table>
    <ng-template #top let-key="key">
      <span class="top-cell">T-{{ key }}</span>
    </ng-template>
    <ng-template #bottom let-key="key">
      <span class="bottom-cell">B-{{ key }}</span>
    </ng-template>`
})
class ExtraHeaderHostComponent {
  cfg = cfg();
  data: Row[] = [{name: 'a'}];
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef let-row="row">
        <div class="row-details">D-{{ row.rowSrc.name }}</div>
      </ng-template>
    </aur-mat-table>`
})
class ExpandedHostComponent {
  cfg = cfg();
  data: Row[] = [{name: 'a'}];
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <div ngxAurTableSubFooterRow class="sub-footer-content">SF</div>
    </aur-mat-table>`
})
class SubFooterHostComponent {
  cfg = cfg();
  data: Row[] = [{name: 'a'}];
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class PlainHostComponent {
  cfg = cfg();
  data: Row[] = [{name: 'a'}];
}

async function setup<T>(hostType: new () => T): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [NgxAurMatTableModule, NoopAnimationsModule],
    declarations: [ExtraHeaderHostComponent, ExpandedHostComponent, SubFooterHostComponent, PlainHostComponent],
  }).compileComponents();
  return TestBed.createComponent(hostType as any) as ComponentFixture<T>;
}

describe('NgxAurMatTable optional-feature defs', () => {

  it('renders extra header rows with template content when templates are provided', async () => {
    const fixture = await setup(ExtraHeaderHostComponent);
    fixture.detectChanges();

    const topRow = fixture.nativeElement.querySelector('tr.extra-header-top-row');
    expect(topRow).not.toBeNull();
    expect(topRow.querySelector('span.top-cell')?.textContent?.trim()).toBe('T-name');
    expect(fixture.nativeElement.querySelector('span.bottom-cell')?.textContent?.trim()).toBe('B-name');
  });

  it('renders no extra header rows without the templates', async () => {
    const fixture = await setup(PlainHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tr.extra-header-top-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('span.bottom-cell')).toBeNull();
  });

  it('expands row details on click when extendedRowTemplate is provided', async () => {
    const fixture = await setup(ExpandedHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.row-details')).toBeNull();

    (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.row-details')?.textContent?.trim()).toBe('D-a');
  });

  it('renders no expanded rows without extendedRowTemplate', async () => {
    const fixture = await setup(PlainHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(0);
  });

  it('renders the sub-footer row with projected content when the directive is present', async () => {
    const fixture = await setup(SubFooterHostComponent);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('tr.mat-mdc-footer-row');
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain('SF');
  });

  it('renders no footer rows in a plain table', async () => {
    const fixture = await setup(PlainHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-footer-row').length).toBe(0);
  });
});
