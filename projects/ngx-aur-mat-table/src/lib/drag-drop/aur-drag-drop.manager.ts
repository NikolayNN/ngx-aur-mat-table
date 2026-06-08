import {finalize, first} from "rxjs";
import {CanDropManager} from "./can-drop-manager";
import {ViewContainerRef} from "@angular/core";
import {DragPreviewManager} from "./drag-preview-manager";
import {DragDropMappingManager} from "./drag-drop-mapping-manager";
import {
  AurDragDropMapping,
  AurDragPreviewMappings,
  DropContext,
} from "./model/aur-drag-drop-mapping";


interface StartDragEvent {
  sourceName: string,
  draggedData: unknown[],
}

interface DropEvent {
  targetName: string,
  targetData: unknown,
}

/**
 * Управляет процессом drag & drop, включая события начала, сброса и завершения.
 * Обрабатывает превью перетаскивания, проверку возможности сброса и обновление набора данных после успешного сброса.
 */
export class AurDragDropManager {
  /**
   *  Управляет логикой проверки возможности сброса
   */
  private readonly canDropManager: CanDropManager;

  /**
   * Управляет отрисовкой превью перетаскивания
   */
  private readonly previewManager: DragPreviewManager;

  /**
   * Управляет сопоставлениями источник-цель
   */
  private readonly mappingManager: DragDropMappingManager;

  /**
   * Хранит информацию о текущей операции перетаскивания
   */
  private startDragEvent?: StartDragEvent;

  /**
   * Хранит информацию о текущей операции сброса
   */
  private dropEvent?: DropEvent;

  /**
   * Создаёт пустой экземпляр AurDragDropManager.
   * @returns {AurDragDropManager} - Пустой менеджер без инициализированных ссылок.
   */
  public static empty(): AurDragDropManager {
    return new AurDragDropManager(undefined!, [], []);
  }

  constructor(viewContainerRef: ViewContainerRef,
              private mappings: AurDragDropMapping<any, any>[],
              private previewMappings: AurDragPreviewMappings<any>[]) {
    this.canDropManager = new CanDropManager(mappings);
    this.previewManager = new DragPreviewManager(viewContainerRef, this.previewMappings);
    this.mappingManager = new DragDropMappingManager(mappings);
  }

  /**
   * Возвращает список всех доступных имён источников перетаскивания.
   * @returns {string[]} - Массив имён источников.
   */
  get draggableSourceNames(): string[] {
    return this.mappings?.map(mapping => mapping.sourceName) || [];
  }

  /**
   * Инициирует операцию перетаскивания, сохраняя контекст и показывая превью перетаскивания.
   * @param {string} sourceName - Имя источника перетаскивания.
   * @param {unknown[]} draggedData - Перетаскиваемые данные.
   * @param {DragEvent} event - Событие перетаскивания.
   * @throws Error если перетаскивание уже выполняется.
   */
  public startDrag(sourceName: string, draggedData: unknown[], event: DragEvent): void {
    this.startDragEvent = {sourceName, draggedData};
    this.previewManager.showPreview(sourceName, event, draggedData)
  }

  /**
   * Проверяет, разрешён ли сброс на целевой элемент, вызывая preventDefault.
   * @param {string} targetName - Имя целевого элемента.
   * @param {DragEvent} event - Событие перетаскивания.
   */
  public canDropPreventDefault(targetName: string, event: DragEvent): void {
    if (!this.startDragEvent) {
      // перетаскивание не начато
      return;
    }
    this.canDropManager.dropPreventDefault(this.startDragEvent.sourceName, targetName, event);
  }

  /**
   * Выполняет операцию сброса на указанную цель.
   * @param {string} targetName - Имя целевого элемента.
   * @param {any} targetData - Данные для целевого элемента.
   */
  public drop(targetName: string, targetData: any): void {
    this.dropEvent = {targetName, targetData}
  }

  /**
   * Завершает операцию перетаскивания и обновляет набор данных, если сброс был успешным.
   */
  public endDrag(): void {
    this.previewManager.removePreview();
    if (!this.dropEvent || !this.startDragEvent) {
      this.startDragEvent = undefined;
      return;
    }

    const mapping = this.getMapping(this.startDragEvent!.sourceName, this.dropEvent.targetName);
    const dropContext = this.buildDropContext();

    this.dropEvent = undefined;
    this.startDragEvent = undefined;

    mapping.afterDropFn(dropContext)?.pipe(first()).subscribe();
  }

  private buildDropContext(): DropContext<any, any> {
    return {
      targetName: this.dropEvent!.targetName,
      targetData: this.dropEvent!.targetData,
      sourceName: this.startDragEvent!.sourceName,
      sourceData: this.startDragEvent!.draggedData,
    }
  }

  private getMapping(sourceName: string, targetName: string): AurDragDropMapping<any, any> {
    return this.mappingManager.get(sourceName, targetName);
  }
}


