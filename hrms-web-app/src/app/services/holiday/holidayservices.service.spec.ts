import { TestBed } from '@angular/core/testing';

import { HolidayservicesService } from './holidayservices.service';

describe('HolidayservicesService', () => {
  let service: HolidayservicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HolidayservicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
