import { booleanAttribute, Directive, Input, TemplateRef } from '@angular/core';
import { AurHeaderCellContext } from '../model/AurHeaderCellContext';

/**
 * Кастомный шаблон заголовка одной колонки.
 * Ставится на <ng-template>, спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurHeaderCellDef="status" let-column let-sort="sort">…</ng-template>
 * Значение атрибута — ColumnConfig.key колонки, к заголовку которой применяется шаблон.
 */
@Directive({
  selector: '[ngxAurHeaderCellDef]',
  standalone: false,
})
export class NgxAurHeaderCellDefDirective {
  /** Ключ колонки (ColumnConfig.key). */
  @Input('ngxAurHeaderCellDef') key!: string;

  /**
   * true — шаблон занимает весь <th> без mat-sort-header (sort пересобирается из контекста).
   * По умолчанию false: шаблон рендерится внутри mat-sort-header (встроенные стрелка и клик
   * сохраняются). Действует только на сортируемых колонках; на несортируемой — no-op.
   */
  @Input({ transform: booleanAttribute }) ownsCell = false;

  constructor(public templateRef: TemplateRef<AurHeaderCellContext>) {}
}
