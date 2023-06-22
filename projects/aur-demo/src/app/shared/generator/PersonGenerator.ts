import {Person} from "../model/person";

export class PersonGenerator {

  private static readonly firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Mike', 'Susan', 'Peter'];
  private static readonly lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  private static readonly genders = ['male', 'female'];
  private static readonly occupations = ['doctor', 'teacher', 'engineer', 'programmer', 'writer'];
  private static readonly countries = ['USA', 'Canada', 'UK', 'France', 'Germany', 'Spain', 'Italy', 'China', 'Japan', 'Australia'];

  private static generateRandomPerson(): Person {
    const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    const age = Math.floor(Math.random() * 50) + 18;
    const gender = this.genders[Math.floor(Math.random() * this.genders.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const address = `${Math.floor(Math.random() * 1000) + 1} Main St`;
    const city = 'Anytown';
    const country = this.countries[Math.floor(Math.random() * this.countries.length)];
    const phoneNumber = `555-${Math.floor(Math.random() * 9000) + 1000}`;
    const occupation = this.occupations[Math.floor(Math.random() * this.occupations.length)];

    return new Person(firstName, lastName, age, gender, email, address, city, country, phoneNumber, occupation);
  }

  public static generate(count: number): Person[] {
    const people: Person[] = [];
    for (let i = 0; i < count; i++) {
      people.push(this.generateRandomPerson());
    }
    return people;
  }
}
