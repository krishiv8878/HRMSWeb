import { TestBed } from '@angular/core/testing';

import { LeavetypeService } from './leavetype.service';

describe('LeavetypeService', () => {
  let service: LeavetypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeavetypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
