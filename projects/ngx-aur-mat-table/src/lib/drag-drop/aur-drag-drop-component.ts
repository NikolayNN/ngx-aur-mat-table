export interface AurDragDropComponent<T> {

  onDragStart($event: DragEvent, data: T): void;

  onDragOver($event: DragEvent, data: T): void;

  onDrop($event: DragEvent, data: T): void;

  onDragEnd($event: DragEvent, data: T): void;
}
