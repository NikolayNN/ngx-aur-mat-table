import {Customer} from "../model/customer";

export class CustomerGenerator {

  static readonly names = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Henry", "Isabel", "Jack", "Kate", "Liam", "Mia", "Nathan", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tom", "Uma", "Violet", "William", "Xander", "Yara", "Zoe"];

  public static generate(count: number): Customer[] {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(this.random())
    }
    return result;
  }

  private static random() {
    const nameIndex = Math.floor(Math.random() * CustomerGenerator.names.length);

    return {
      name: CustomerGenerator.names[nameIndex],
      age: CustomerGenerator.randomNumber(20, 50),
    };
  }

  private static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


}
