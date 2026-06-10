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
class TrackByHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{key: 'name', name: 'Name', valueConverter: v => v.name}],
  };
  data: Row[] = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
}

describe('NgxAurMatTable trackBy DOM reuse', () => {
  let fixture: ComponentFixture<TrackByHostComponent>;
  let host: TrackByHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TrackByHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackByHostComponent);
    host = fixture.componentInstance;
  });

  function bodyRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
  }

  it('reuses <tr> elements when the same objects are reordered', () => {
    fixture.detectChanges();
    const rowsBefore = bodyRows();
    expect(rowsBefore.map(tr => tr.textContent!.trim())).toEqual(['a', 'b', 'c']);
    const elementByText = new Map(rowsBefore.map(tr => [tr.textContent!.trim(), tr]));

    // те же ОБЪЕКТЫ, новый порядок и новая ссылка на массив (триггерит ngOnChanges)
    host.data = [host.data[2], host.data[0], host.data[1]];
    fixture.detectChanges();

    const rowsAfter = bodyRows();
    expect(rowsAfter.map(tr => tr.textContent!.trim())).toEqual(['c', 'a', 'b']);
    rowsAfter.forEach(tr => {
      expect(elementByText.get(tr.textContent!.trim()))
        .withContext(`<tr> "${tr.textContent!.trim()}" должен быть тем же DOM-узлом`)
        .toBe(tr);
    });
  });
});
