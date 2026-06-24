import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; status: string; }

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurRowMarkerDef let-rowSrc let-i="index">
        <span class="m">{{ rowSrc.status }}-{{ i }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class MarkerDefHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    timelineCfg: { enable: true },
  };
  data: R[] = [{ name: 'a', status: 'ok' }, { name: 'b', status: 'warn' }];
}

describe('ngxAurRowMarkerDef', () => {
  function markers(fixture: ComponentFixture<any>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.m'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('доставляет marker-шаблон и обогащённый контекст (rowSrc + index)', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MarkerDefHost],
    });
    const fixture = TestBed.createComponent(MarkerDefHost);
    fixture.detectChanges();
    expect(markers(fixture)).toEqual(['ok-0', 'warn-1']);
  });
});
