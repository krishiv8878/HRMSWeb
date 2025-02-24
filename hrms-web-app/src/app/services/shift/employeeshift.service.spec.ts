import { TestBed } from '@angular/core/testing';

import { EmployeeshiftService } from './employeeshift.service';

describe('EmployeeshiftService', () => {
  let service: EmployeeshiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeshiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
