import {finalize, first, map, Observable, of, switchMap,} from "rxjs";
import {CanDropManager} from "./can-drop-manager";
import {ViewContainerRef} from "@angular/core";
import {DragPreviewManager} from "./drag-preview-manager";
import {DragDropMappingManager} from "./drag-drop-mapping-manager";
import {
  AurDragDropMapping,
  AurDragPreviewMappings,
  AurDropResult,
  DropContext,
  GrabContext
} from "./model/aur-drag-drop-mapping";


interface StartDragEvent {
  sourceName: string,
  draggedData: unknown[],
}

interface DropEvent {
  targetName: string,
  targetData: unknown,
  dropResult: Observable<AurDropResult<any>>
}

/**
 * Класс AurDragDropManager управляет процессом drag-and-drop, включая начало, выполнение и завершение перетаскивания.
 * Он также управляет предварительным просмотром, проверкой возможности выполнения drop и обновлением данных после drop.
 */
export class AurDragDropManager {
  /**
   * Менеджер для проверки возможности выполнения drop операции
   */
  private readonly canDropManager: CanDropManager;

  /**
   * Менеджер для управления предварительным просмотром перетаскиваемого элемента
   */
  private readonly previewManager: DragPreviewManager;

  /**
   * Менеджер для управления маппингами между источником и целью перетаскивания
   */
  private readonly mappingManager: DragDropMappingManager;

  /**
   * Событие начала перетаскивания, содержит информацию об источнике и данных, которые перетаскиваются
   */
  private startDragEvent?: StartDragEvent;

  /**
   * Событие drop, undefined если drop был на неразрешенном элементе
   */
  private dropEvent?: DropEvent;

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
   * Возвращает список всех возможных источников для перетаскивания
   * @returns Массив имен источников
   */
  get draggableSourceNames(): string[] {
    return this.mappings?.map(mapping => mapping.sourceName) || [];
  }

  /**
   * Метод для начала перетаскивания, сохраняет начальный контекст, а также отображает Preview перетаскиваемого элемента
   * @param sourceName Имя источника, с которого начинается перетаскивание
   * @param draggedData Данные, которые перетаскиваются
   * @param event Событие перетаскивания
   * @throws Ошибка, если предыдущее перетаскивание еще не завершено
   */
  public startDrag(sourceName: string, draggedData: unknown[], event: DragEvent): void {
    // if (this.startDragEvent) {
    //   throw new Error('Start new drag before complete current')
    // }
    this.startDragEvent = {sourceName, draggedData};
    this.previewManager.showPreview(sourceName, event, draggedData)
  }

  /**
   * Метод для обработки события preventDefault для разрешения / запрещения drop на элементе
   * @param targetName Имя цели, на которую происходит перетаскивание
   * @param $event Событие перетаскивания
   */
  public canDropPreventDefault(targetName: string, $event: DragEvent): void {
    this.canDropManager.dropPreventDefault(this.startDragEvent?.sourceName, targetName, $event);
  }

  /**
   * Метод для выполнения drop на указанную цель
   * @param targetDataset Данные целевой таблицы
   * @param targetName Имя цели, на которую выполняется drop
   * @param targetData Данные цели в которые выполняется drop
   * @returns Observable с результатом drop операции
   */
  public drop(targetDataset: unknown[], targetName: string, targetData: any): Observable<AurDropResult<any>> {
    const mapping = this.getMapping(this.startDragEvent!.sourceName, targetName);
    const dropContext = this.buildDropContext(targetName, targetData, targetDataset)
    const dropResult = mapping.dropFn(dropContext).pipe(first());
    this.dropEvent = {targetName, targetData, dropResult}
    return dropResult;
  }

  private buildDropContext(targetName: string, targetData: any, targetDataSet: unknown[]): DropContext<any, any> {
    return {
      targetName,
      targetData,
      targetDataset: targetDataSet,
      sourceName: this.startDragEvent!.sourceName,
      sourceData: this.startDragEvent!.draggedData,
    }
  }

  public endDrag(sourceDataset: unknown[]): Observable<AurDropResult<any>> {
    this.previewManager.removePreview();

    if (!this.dropEvent) {
      const dropResult = of({isValid: false, updatedDataset: []});
      this.dropEvent = {targetName: '---?unknow-target?----', targetData: null, dropResult}
      return dropResult;
    }
    return this.dropEvent!.dropResult.pipe(
      switchMap(dropEvent => {
        if (dropEvent.isValid) {
          const grabContext = this.buildGrabContext(sourceDataset);

          return this.calcDatasetAfterGrab(grabContext).pipe(
            map(updatedDataset => ({isValid: true, updatedDataset}))
          );
        } else {
          return of({isValid: false, updatedDataset: []});
        }
      }),
      finalize(() => {
        this.dropEvent = undefined;
        this.startDragEvent = undefined;
      })
    );
  }

  private buildGrabContext(sourceDataset: unknown[]): GrabContext<any, any> {
    return {
      targetName: this.dropEvent!.targetName,
      targetData: this.dropEvent!.targetData,
      sourceName: this.startDragEvent!.sourceName,
      sourceData: this.startDragEvent!.draggedData,
      sourceDataset: sourceDataset
    }
  }

  private calcDatasetAfterGrab(grabCtx: GrabContext<any, any>): Observable<unknown[]> {
    const mapping = this.getMapping(this.startDragEvent!.sourceName, this.dropEvent!.targetName);
    return mapping!.grabFn(grabCtx).pipe(first());
  }

  private getMapping(sourceName: string, targetName: string): AurDragDropMapping<any, any> {
    return this.mappingManager.get(sourceName, targetName);
  }
}


