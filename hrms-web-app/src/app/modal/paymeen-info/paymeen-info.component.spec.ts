import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymeenInfoComponent } from './paymeen-info.component';

describe('PaymeenInfoComponent', () => {
  let component: PaymeenInfoComponent;
  let fixture: ComponentFixture<PaymeenInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymeenInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymeenInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
