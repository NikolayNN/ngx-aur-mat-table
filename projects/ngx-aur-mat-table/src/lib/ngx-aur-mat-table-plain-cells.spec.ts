import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row {
  name: string;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class PlainCellsHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [
      {key: 'plain', name: 'Plain', valueConverter: v => v.name},
      {
        key: 'icon', name: 'Icon', valueConverter: v => v.name,
        valueView: {icon: {name: () => 'home'}}
      },
      {
        key: 'textView', name: 'TextView', valueConverter: v => v.name,
        valueView: {text: {color: () => 'red'}}
      },
    ],
  };
  data: Row[] = [{name: 'a'}];
}

describe('NgxAurMatTable plain cells', () => {
  let fixture: ComponentFixture<PlainCellsHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PlainCellsHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PlainCellsHostComponent);
  });

  function cells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td.mat-mdc-cell'));
  }

  it('plain column cell skips cell components and renders a bare span', () => {
    fixture.detectChanges();
    const plainCell = cells()[0];
    expect(plainCell.querySelector('lib-column-view')).toBeNull();
    const span = plainCell.querySelector('span.aur-plain-cell');
    expect(span).not.toBeNull();
    expect(span!.textContent!.trim()).toBe('a');
  });

  it('icon column still renders lib-column-view with the icon', () => {
    fixture.detectChanges();
    const iconCell = cells()[1];
    expect(iconCell.querySelector('lib-column-view')).not.toBeNull();
    expect(iconCell.querySelector('lib-column-view mat-icon')).not.toBeNull();
    expect(iconCell.textContent).toContain('a');
  });

  it('text-only view column does not instantiate lib-icon-view', () => {
    fixture.detectChanges();
    const textViewCell = cells()[2];
    expect(textViewCell.querySelector('lib-column-view')).not.toBeNull();
    expect(textViewCell.querySelector('lib-icon-view')).toBeNull();
  });

  it('no empty icon wrappers: every rendered lib-icon-view contains an icon', () => {
    fixture.detectChanges();
    const iconViews = Array.from(fixture.nativeElement.querySelectorAll('td lib-icon-view')) as HTMLElement[];
    expect(iconViews.length).toBe(1); // только колонка с иконкой
    iconViews.forEach(iv =>
      expect(iv.querySelector('mat-icon'))
        .withContext('lib-icon-view без иконки не должен рендерить пустой div')
        .not.toBeNull());
  });
});
