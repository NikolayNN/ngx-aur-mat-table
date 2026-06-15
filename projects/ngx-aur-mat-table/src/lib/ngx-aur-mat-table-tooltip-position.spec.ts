import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Позиции всех MatTooltip в DOM (в этих хостах ровно один тултип на хост). */
function tooltipPositions(fixture: ComponentFixture<unknown>): string[] {
  return fixture.debugElement.queryAll(By.directive(MatTooltip))
    .map(de => de.injector.get(MatTooltip).position);
}

// ---------- иконка ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IconPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { icon: { name: () => 'info', tooltip: () => 'hint', tooltipPosition: 'right' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: icon', () => {
  let fixture: ComponentFixture<IconPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(IconPosHost);
    fixture.detectChanges();
  });
  it("иконка: matTooltipPosition === 'right'", () => {
    expect(tooltipPositions(fixture)).toEqual(['right']);
  });
});

// ---------- текст ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class TextPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { text: { tooltip: () => 'hint', tooltipPosition: 'above' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: text', () => {
  let fixture: ComponentFixture<TextPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TextPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(TextPosHost);
    fixture.detectChanges();
  });
  it("текст: matTooltipPosition === 'above'", () => {
    expect(tooltipPositions(fixture)).toEqual(['above']);
  });
});

// ---------- действие ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ActionPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: { actions: [{ action: () => 'edit', icon: { name: () => 'edit', tooltip: () => 'hint', tooltipPosition: 'left' } }] },
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: action', () => {
  let fixture: ComponentFixture<ActionPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ActionPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ActionPosHost);
    fixture.detectChanges();
  });
  it("действие: matTooltipPosition === 'left'", () => {
    expect(tooltipPositions(fixture)).toEqual(['left']);
  });
});

// ---------- дефолт (регрессия) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DefaultPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { icon: { name: () => 'info', tooltip: () => 'hint' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: default', () => {
  let fixture: ComponentFixture<DefaultPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DefaultPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(DefaultPosHost);
    fixture.detectChanges();
  });
  it("без tooltipPosition → 'below'", () => {
    expect(tooltipPositions(fixture)).toEqual(['below']);
  });
});

// ---------- триггер меню ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class MenuActionPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: { actions: [{ action: () => 'more', icon: { name: () => 'more_vert', tooltip: () => 'hint', tooltipPosition: 'before' }, menu: [{ action: () => 'x', text: () => 'X' }] }] },
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: menu action', () => {
  let fixture: ComponentFixture<MenuActionPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MenuActionPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuActionPosHost);
    fixture.detectChanges();
  });
  it("меню-триггер: matTooltipPosition === 'before'", () => {
    expect(tooltipPositions(fixture)).toEqual(['before']);
  });
});
