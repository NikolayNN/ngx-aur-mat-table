export class Person {
  constructor(
    public firstName: string,
    public lastName: string,
    public age: number,
    public gender: string,
    public email: string,
    public address: string,
    public city: string,
    public country: string,
    public phoneNumber: string,
    public occupation: string) {
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getAddress(): string {
    return `${this.address}, ${this.city}, ${this.country}`;
  }
}
