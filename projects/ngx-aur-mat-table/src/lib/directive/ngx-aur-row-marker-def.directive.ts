import { Directive, TemplateRef } from '@angular/core';
import { AurRowContext } from '../model/AurRowContext';

/**
 * Шаблон маркера строки (timeline). Ставится на <ng-template>,
 * спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurRowMarkerDef let-rowSrc let-row="row">…</ng-template>
 */
@Directive({
  selector: '[ngxAurRowMarkerDef]',
  standalone: false,
})
export class NgxAurRowMarkerDefDirective {
  constructor(public templateRef: TemplateRef<AurRowContext<any>>) {}
}
