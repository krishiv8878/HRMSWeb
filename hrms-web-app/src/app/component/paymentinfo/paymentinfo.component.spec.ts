import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentinfoComponent } from './paymentinfo.component';

describe('PaymentinfoComponent', () => {
  let component: PaymentinfoComponent;
  let fixture: ComponentFixture<PaymentinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentinfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
