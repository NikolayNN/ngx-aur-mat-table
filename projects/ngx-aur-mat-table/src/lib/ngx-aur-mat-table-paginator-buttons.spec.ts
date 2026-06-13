import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Базовый конфиг с включённой клиентской пагинацией; paginationCfg переопределяется через extra. */
function cfgWith(pagination: TableConfig<Row>['paginationCfg']): TableConfig<Row> {
  return {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    paginationCfg: pagination,
  };
}

function hasFirstLastButtons(fixture: ComponentFixture<unknown>): boolean {
  const first = fixture.nativeElement.querySelector('.mat-mdc-paginator-navigation-first');
  const last = fixture.nativeElement.querySelector('.mat-mdc-paginator-navigation-last');
  return !!first && !!last;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PaginatorButtonsHostComponent {
  cfg: TableConfig<Row> = cfgWith({ enable: true, size: 5 });
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('NgxAurMatTable paginator first/last buttons', () => {
  let fixture: ComponentFixture<PaginatorButtonsHostComponent>;
  let host: PaginatorButtonsHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PaginatorButtonsHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PaginatorButtonsHostComponent);
    host = fixture.componentInstance;
  });

  it('по умолчанию кнопки first/last показаны (пин текущего поведения)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeTrue();
  }));

  it('showFirstLastButtons: false скрывает кнопки', fakeAsync(() => {
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: false });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeFalse();
  }));

  it('смена ссылки tableConfig в рантайме переключает кнопки', fakeAsync(() => {
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: false });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeFalse();

    // хост заменяет ССЫЛКУ на конфиг (как по брейкпоинту) — без пересборки данных
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: true });
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeTrue();
  }));
});
