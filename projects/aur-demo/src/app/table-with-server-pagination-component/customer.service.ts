import {delay, Observable, of} from "rxjs";
import {Page} from "./page.model";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

export class CustomerService {

  private customers: Customer[] = CustomerGenerator.generate(1000);

  page(page: number, pageSize: number): Observable<Page<Customer>> {
    const startIndex = (page) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, this.customers.length);
    //создаю копию чтобы изменилась ссылка для имитации того что пришли новые данные с сервера
    const content = this.customers.slice(startIndex, endIndex).map(c => ({
      id: c.id,
      name: c.name,
      age: c.age
    }));
    const totalElements = this.customers.length;
    const totalPages = Math.ceil(totalElements / pageSize);
    const pageObject = new Page<Customer>(
      content,
      totalElements,
      totalPages,
      page,
      content.length,
      page === 1,
      page === totalPages,
      content.length === 0
    );
    return of(pageObject).pipe(delay(500));
  }
}
