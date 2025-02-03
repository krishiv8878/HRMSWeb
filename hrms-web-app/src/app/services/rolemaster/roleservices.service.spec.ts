import { TestBed } from '@angular/core/testing';

import { RoleservicesService } from './roleservices.service';

describe('RoleservicesService', () => {
  let service: RoleservicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleservicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
