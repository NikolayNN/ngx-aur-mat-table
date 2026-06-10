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

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class BusinessKeyHostComponent {
  cfg: TableConfig<{id: number; name: string}> = {
    trackBy: item => item.id,
    columnsCfg: [{key: 'name', name: 'Name', valueConverter: v => v.name}],
  };
  data = [{id: 1, name: 'a'}, {id: 2, name: 'b'}, {id: 3, name: 'c'}];
}

describe('NgxAurMatTable trackBy business key DOM reuse', () => {
  let fixture: ComponentFixture<BusinessKeyHostComponent>;
  let host: BusinessKeyHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [BusinessKeyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BusinessKeyHostComponent);
    host = fixture.componentInstance;
  });

  function bodyRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
  }

  it('reuses <tr> elements for FRESH objects with the same business keys', () => {
    fixture.detectChanges();
    const rowsBefore = bodyRows();
    expect(rowsBefore.map(tr => tr.textContent!.trim())).toEqual(['a', 'b', 'c']);
    const elementByText = new Map(rowsBefore.map(tr => [tr.textContent!.trim(), tr]));

    // полностью НОВЫЕ объекты (как свежий ответ сервера), те же id, обновлённое имя у id=2
    host.data = [{id: 1, name: 'a'}, {id: 2, name: 'b2'}, {id: 3, name: 'c'}];
    fixture.detectChanges();

    const rowsAfter = bodyRows();
    expect(rowsAfter.map(tr => tr.textContent!.trim())).toEqual(['a', 'b2', 'c']);
    // те же DOM-узлы по бизнес-ключу, контент обновился
    expect(elementByText.get('a')).toBe(rowsAfter[0]);
    expect(elementByText.get('b')).toBe(rowsAfter[1]);
    expect(elementByText.get('c')).toBe(rowsAfter[2]);
  });
});
