import { TestBed } from '@angular/core/testing';

import { EmployeeeService } from './employeee.service';

describe('EmployeeeService', () => {
  let service: EmployeeeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
