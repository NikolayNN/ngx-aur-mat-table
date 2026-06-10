import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class FitHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: v => v.age,
        size: { fit: true }, totalConverter: rows => rows.length },
    ],
    indexCfg: { enable: true, size: { fit: true } },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable ColumnSize.fit', () => {
  let fixture: ComponentFixture<FitHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [FitHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FitHostComponent);
    fixture.detectChanges();
  });

  // порядок колонок: [0]=tbl_index, [1]=name, [2]=age
  function headerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'));
  }
  function bodyCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td'));
  }
  function footerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-footer-row] td'));
  }

  it('fit-колонка данных: th/td/footer-td несут aur-col-fit', () => {
    expect(headerCells()[2].classList.contains('aur-col-fit')).toBeTrue();
    expect(bodyCells()[2].classList.contains('aur-col-fit')).toBeTrue();
    expect(footerCells()[2].classList.contains('aur-col-fit')).toBeTrue();
  });

  it('индексная колонка с size.fit несёт aur-col-fit', () => {
    expect(headerCells()[0].classList.contains('aur-col-fit')).toBeTrue();
    expect(bodyCells()[0].classList.contains('aur-col-fit')).toBeTrue();
  });

  it('колонка без fit класса не имеет', () => {
    expect(headerCells()[1].classList.contains('aur-col-fit')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-col-fit')).toBeFalse();
  });
});
