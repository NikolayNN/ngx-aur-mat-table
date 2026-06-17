import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Кастомный шаблон тела ячеек одной колонки.
 * Ставится на <ng-template>, спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurCellDef="status" let-value let-row="row">…</ng-template>
 * Значение атрибута — ColumnConfig.key колонки, к ячейкам которой применяется шаблон.
 */
@Directive({
  selector: '[ngxAurCellDef]',
  standalone: false,
})
export class NgxAurCellDefDirective {
  /** Ключ колонки (ColumnConfig.key). */
  @Input('ngxAurCellDef') key!: string;

  constructor(public templateRef: TemplateRef<any>) {}
}
