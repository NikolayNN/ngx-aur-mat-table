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
 * Manages the drag-and-drop process, including start, drop, and end events.
 * Handles drag previews, drop validation, and dataset updates after a successful drop.
 */
export class AurDragDropManager {
  /**
   *  Manages drop validation logic
   */
  private readonly canDropManager: CanDropManager;

  /**
   * Manages drag preview rendering
   */
  private readonly previewManager: DragPreviewManager;

  /**
   * Manages source-target mappings
   */
  private readonly mappingManager: DragDropMappingManager;

  /**
   * Holds info about the current drag operation
   */
  private startDragEvent?: StartDragEvent;

  /**
   * Holds info about the current drop operation
   */
  private dropEvent?: DropEvent;

  /**
   * Creates an empty instance of AurDragDropManager.
   * @returns {AurDragDropManager} - An empty manager with no initialized references.
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
   * Returns the list of all available draggable source names.
   * @returns {string[]} - Array of source names.
   */
  get draggableSourceNames(): string[] {
    return this.mappings?.map(mapping => mapping.sourceName) || [];
  }

  /**
   * Initiates a drag operation, saving the context and showing a drag preview.
   * @param {string} sourceName - The name of the drag source.
   * @param {unknown[]} draggedData - The data being dragged.
   * @param {DragEvent} event - The drag event.
   * @throws Error if a drag is already in progress.
   */
  public startDrag(sourceName: string, draggedData: unknown[], event: DragEvent): void {
    this.startDragEvent = {sourceName, draggedData};
    this.previewManager.showPreview(sourceName, event, draggedData)
  }

  /**
   * Validates whether a drop is allowed on the target element by calling preventDefault.
   * @param {string} targetName - The name of the target element.
   * @param {DragEvent} event - The drag event.
   */
  public canDropPreventDefault(targetName: string, event: DragEvent): void {
    if (!this.startDragEvent) {
      // перетаскивание не начато
      return;
    }
    this.canDropManager.dropPreventDefault(this.startDragEvent.sourceName, targetName, event);
  }

  /**
   * Executes the drop operation on the specified target.
   * @param {string} targetName - The name of the target element.
   * @param {any} targetData - The data for the target element.
   */
  public drop(targetName: string, targetData: any): void {
    this.dropEvent = {targetName, targetData}
  }

  /**
   * Ends the drag operation and updates the dataset if the drop was successful.
   */
  public endDrag(): void {
    this.previewManager.removePreview();
    if (!this.dropEvent || !this.startDragEvent) {
      return;
    }

    const mapping = this.getMapping(this.startDragEvent!.sourceName, this.dropEvent.targetName);
    const dropContext = this.buildDropContext()

    mapping.afterDropFn(dropContext)?.pipe(first())
      .pipe(
        finalize(() => {
          this.dropEvent = undefined;
          this.startDragEvent = undefined;
        })
      ).subscribe();
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


