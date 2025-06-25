import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassportinfoComponent } from './passportinfo.component';

describe('PassportinfoComponent', () => {
  let component: PassportinfoComponent;
  let fixture: ComponentFixture<PassportinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassportinfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassportinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
