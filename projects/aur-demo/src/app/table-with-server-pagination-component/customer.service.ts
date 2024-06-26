import {delay, Observable, of} from "rxjs";
import {Page} from "./page.model";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

export class CustomerService {

  private customers: Customer[] = CustomerGenerator.generate(1000);

  page(page: number, pageSize: number): Observable<Page<Customer>> {
    const startIndex = (page) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, this.customers.length);
    const content = this.customers.slice(startIndex, endIndex);
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
    return of(pageObject).pipe(delay(1000));
  }
}
