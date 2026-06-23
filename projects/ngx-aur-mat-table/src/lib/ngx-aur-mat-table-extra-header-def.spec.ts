import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExtraHeaderTopDef let-key="key"><span class="top">T-{{ key }}</span></ng-template>
      <ng-template ngxAurExtraHeaderBottomDef let-key="key"><span class="bottom">B-{{ key }}</span></ng-template>
    </aur-mat-table>
  `,
})
class ExtraHeaderDefHost {
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }];
}

describe('ngxAurExtraHeaderTopDef / ngxAurExtraHeaderBottomDef', () => {
  let fixture: ComponentFixture<ExtraHeaderDefHost>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExtraHeaderDefHost],
    });
    fixture = TestBed.createComponent(ExtraHeaderDefHost);
    fixture.detectChanges();
  });

  it('доставляет extra-top шаблон с контекстом {key}', () => {
    const top = fixture.nativeElement.querySelector('.top') as HTMLElement;
    expect(top).not.toBeNull();
    expect(top.textContent!.trim()).toBe('T-name');
  });

  it('доставляет extra-bottom шаблон с контекстом {key}', () => {
    const bottom = fixture.nativeElement.querySelector('.bottom') as HTMLElement;
    expect(bottom).not.toBeNull();
    expect(bottom.textContent!.trim()).toBe('B-name');
  });
});
