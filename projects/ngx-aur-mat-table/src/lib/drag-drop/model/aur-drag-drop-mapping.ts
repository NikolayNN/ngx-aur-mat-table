import {Observable} from "rxjs";
import {AurDragPreviewComponent} from "./aur-drag-preview-component";

export interface AurDragPreviewMappings<SOURCE> {
  sourceName: string,
  readonly preview?: new () => AurDragPreviewComponent<SOURCE>;
}

/**
 * Интерфейс, представляющий конфигурацию сопоставления для функциональности drag & drop
 * между компонентами. Он определяет компонент-источник (откуда захватываются данные)
 * и компонент-цель (куда сбрасываются данные), а также функции, которые обрабатывают
 * захват и сброс данных.
 *
 * @template SOURCE - Тип данных, используемых компонентом-источником.
 * @template TARGET - Тип данных, используемых компонентом-целью.
 */
export interface AurDragDropMapping<SOURCE, TARGET> {

  /**
   * Имя компонента-источника, из которого могут захватываться данные.
   * Представляет компонент, позволяющий пользователю инициировать действие захвата.
   */
  readonly sourceName: string,

  /**
   * Имя компонента-цели, куда могут сбрасываться данные.
   * Представляет компонент, который принимает действие сброса.
   */
  readonly targetName: string,

  /**
   * Функция, вызываемая для обработки действия сброса в компоненте-цели.
   * Она вызывается при возникновении события сброса и описывает, как обработать
   * данные в компоненте-цели.
   *
   * @param ctx - Контекст сброса, содержащий информацию об источнике и цели.
   * @returns Массив элементов данных типа TARGET.
   */
  readonly afterDropFn: (ctx: DropContext<SOURCE, TARGET>) => Observable<AurDropResult>,
}

export interface AurDropResult {
}

export interface DropContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE[],

  readonly targetName: string,
  readonly targetData: TARGET,
}
