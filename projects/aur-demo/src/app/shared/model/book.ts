import {Author} from "./author";

export class Book {
  constructor(
    public id: number,
    public name: string,
    public author: Author
  ) {
  }

}
