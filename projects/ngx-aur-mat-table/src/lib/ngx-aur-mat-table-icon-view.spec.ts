import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IconHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: {
        icon: {
          name: () => 'info',
          tooltip: () => 'hint',
          tooltipClass: () => 'tt-custom',
          position: 'end',
        },
      },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable icon tooltipClass/position (render)', () => {
  let fixture: ComponentFixture<IconHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
  });

  it('lib-icon-view с position end несёт класс icon-end', () => {
    const iconView = fixture.nativeElement.querySelector('tr[mat-row] lib-icon-view') as HTMLElement;
    expect(iconView.classList.contains('icon-end')).toBeTrue();
  });

  it('tooltipClass доезжает до MatTooltip иконки', () => {
    const tooltipDe = fixture.debugElement
      .queryAll(By.directive(MatTooltip))
      .find(de => de.nativeElement.tagName.toLowerCase() === 'mat-icon')!;
    expect(tooltipDe.injector.get(MatTooltip).tooltipClass).toBe('tt-custom');
  });
});
