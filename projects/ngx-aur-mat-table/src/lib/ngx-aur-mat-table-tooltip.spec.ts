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
class TooltipHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [
      {key: 'plain', name: 'Plain', valueConverter: v => v.name},
      {
        key: 'tip', name: 'Tip', valueConverter: v => v.name,
        valueView: {text: {tooltip: r => 'tt-' + r.rowSrc.name}}
      },
      {
        key: 'icon', name: 'Icon', valueConverter: v => v.name,
        valueView: {icon: {name: () => 'home'}}
      },
      {
        key: 'iconTip', name: 'IconTip', valueConverter: v => v.name,
        valueView: {icon: {name: () => 'home', tooltip: r => 'it-' + r.rowSrc.name}}
      },
    ],
    actionCfg: {
      actions: [
        {action: () => 'with-tip', icon: {name: () => 'edit', tooltip: () => 'edit row'}},
        {action: () => 'no-tip', icon: {name: () => 'delete'}},
      ]
    }
  };
  data: Row[] = [{name: 'a'}];
}

// MatTooltip вешает на хост-элемент класс mat-mdc-tooltip-trigger —
// по нему проверяем, что директива создаётся только там, где тултип задан
describe('NgxAurMatTable tooltip instantiation', () => {
  let fixture: ComponentFixture<TooltipHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TooltipHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TooltipHostComponent);
  });

  function cells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td.mat-mdc-cell'));
  }

  function triggers(el: HTMLElement): Element[] {
    return Array.from(el.querySelectorAll('.mat-mdc-tooltip-trigger'));
  }

  it('plain text cell carries no tooltip trigger', () => {
    fixture.detectChanges();
    expect(triggers(cells()[0]).length).toBe(0);
  });

  it('cell with text tooltip carries the trigger on its span', () => {
    fixture.detectChanges();
    const t = triggers(cells()[1]);
    expect(t.length).toBe(1);
    expect(t[0].tagName.toLowerCase()).toBe('span');
  });

  it('icon without tooltip carries no trigger', () => {
    fixture.detectChanges();
    expect(triggers(cells()[2]).length).toBe(0);
  });

  it('icon with tooltip carries exactly one trigger and it is the mat-icon', () => {
    fixture.detectChanges();
    const t = triggers(cells()[3]);
    expect(t.length).toBe(1);
    expect(t[0].tagName.toLowerCase()).toBe('mat-icon');
  });

  it('action buttons: trigger only on the action with a tooltip', () => {
    fixture.detectChanges();
    const actionCell = cells()[4];
    const buttons = Array.from(actionCell.querySelectorAll('button')) as HTMLElement[];
    expect(buttons.length).toBe(2);
    // После рефакторинга тултип переехал на <span>-обёртку (чтобы disabled-кнопка тоже показывала тултип).
    // Проверяем, что span-триггер есть только у первой кнопки (с тултипом), а не у второй.
    const spans = Array.from(actionCell.querySelectorAll('span.mat-mdc-tooltip-trigger')) as HTMLElement[];
    expect(spans.length).toBe(1);
    expect(buttons[1].classList.contains('mat-mdc-tooltip-trigger')).toBeFalse();
  });
});
