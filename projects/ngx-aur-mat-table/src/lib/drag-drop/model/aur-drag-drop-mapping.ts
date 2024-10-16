import {Observable} from "rxjs";
import {AurDragPreviewComponent} from "./aur-drag-preview-component";

export interface AurDragPreviewMappings<SOURCE> {
  sourceName: string,
  readonly preview?: new () => AurDragPreviewComponent<SOURCE>;
}

/**
 * Interface representing the mapping configuration for drag-and-drop functionality
 * between components. It defines the source component (from where data is grabbed)
 * and the target component (where data is dropped), as well as the functions that handle
 * the grabbing and dropping of data.
 *
 * @template SOURCE - The type of data used by the source component.
 * @template TARGET - The type of data used by the target component.
 */
export interface AurDragDropMapping<SOURCE, TARGET> {

  /**
   * The name of the source component from which data can be grabbed.
   * This represents the component that allows a user to initiate a grab action.
   */
  readonly sourceName: string,

  /**
   * The name of the target component where the data can be dropped.
   * This represents the component that accepts the drop action.
   */
  readonly targetName: string,

  /**
   * Function called to handle grabbing data from the source component.
   * It is invoked after a drop has occurred, and it describes what should
   * happen to the data in the source table.
   *
   * @param ctx - The grab context containing information about the source and target.
   * @returns An array of data elements of type SOURCE.
   */
  readonly grabFn: (ctx: GrabContext<SOURCE, TARGET>) => Observable<SOURCE[]>

  /**
   * Function called to handle the drop action in the target component.
   * It is invoked when the drop event occurs, and it describes how to process
   * the data into the target component.
   *
   * @param ctx - The drop context containing information about the source and target.
   * @returns An array of data elements of type TARGET.
   */
  readonly dropFn: (ctx: DropContext<SOURCE, TARGET>) => Observable<AurDropResult<TARGET>>,
}

export interface AurDropResult<TARGET> {
  isValid: boolean;
  updatedDataset: TARGET[]
}

export interface GrabContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE[],
  readonly sourceDataset: SOURCE[],

  readonly targetName: string,
  readonly targetData: TARGET,
}

export interface DropContext<SOURCE, TARGET> {
  readonly sourceName: string,
  readonly sourceData: SOURCE[],

  readonly targetDataset: TARGET[],
  readonly targetName: string,
  readonly targetData: TARGET,
}
