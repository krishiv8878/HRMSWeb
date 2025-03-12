import { TestBed } from '@angular/core/testing';

import { AttendanceRequestService } from './attendance-request.service';

describe('AttendanceRequestService', () => {
  let service: AttendanceRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
