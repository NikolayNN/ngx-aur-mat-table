import { Directive, TemplateRef } from '@angular/core';
import { AurRowContext } from '../model/AurRowContext';

/**
 * Шаблон тела detail-строки (раскрытие). Ставится на <ng-template>,
 * спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurExpandedRowDef let-rowSrc let-row="row">…</ng-template>
 */
@Directive({
  selector: '[ngxAurExpandedRowDef]',
  standalone: false,
})
export class NgxAurExpandedRowDefDirective {
  constructor(public templateRef: TemplateRef<AurRowContext<any>>) {}
}
