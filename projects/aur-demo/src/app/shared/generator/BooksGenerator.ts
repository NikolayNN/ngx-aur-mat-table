import {Book} from "../model/book";
import {Author} from "../model/author";

export class BooksGenerator {

  static authors: Author[] = [
    new Author(1, 'Jane Austen'),
    new Author(2, 'Charles Dickens'),
    new Author(3, 'Mark Twain'),
    new Author(4, 'Agatha Christie'),
    new Author(5, 'J.K. Rowling'),
    new Author(6, 'Leo Tolstoy'),
    new Author(7, 'Ernest Hemingway'),
    new Author(8, 'Virginia Woolf'),
    new Author(9, 'Gabriel Garcia Marquez'),
    new Author(10, 'Haruki Murakami')
  ];

  static generate(numBooks: number): Book[] {
    const books: Book[] = [];
    for (let i = 1; i <= numBooks; i++) {
      const randomAuthor: Author = this.authors[Math.floor(Math.random() * this.authors.length)];
      const randomName: string = this.generateRandomName();
      const randomBook: Book = new Book(i, randomName, randomAuthor);
      books.push(randomBook);
    }

    return books;
  }

  private static generateRandomName(): string {
    const wordCount: number = Math.floor(Math.random() * 4) + 1;
    let name: string = '';

    for (let i = 0; i < wordCount; i++) {
      const randomChar: string = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      name += randomChar.toUpperCase() + Array(Math.floor(Math.random() * 6) + 1).join(randomChar);
      if (i < wordCount - 1) {
        name += ' ';
      }
    }

    return name;
  }
}
