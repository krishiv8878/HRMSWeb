import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftemployeeComponent } from './shiftemployee.component';

describe('ShiftemployeeComponent', () => {
  let component: ShiftemployeeComponent;
  let fixture: ComponentFixture<ShiftemployeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftemployeeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftemployeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
