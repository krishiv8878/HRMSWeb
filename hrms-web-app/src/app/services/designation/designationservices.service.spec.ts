import { TestBed } from '@angular/core/testing';

import { DesignationservicesService } from './designationservices.service';

describe('DesignationservicesService', () => {
  let service: DesignationservicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesignationservicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
