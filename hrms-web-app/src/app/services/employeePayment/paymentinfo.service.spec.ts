import { TestBed } from '@angular/core/testing';

import { PaymentinfoService } from './paymentinfo.service';

describe('PaymentinfoService', () => {
  let service: PaymentinfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentinfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
