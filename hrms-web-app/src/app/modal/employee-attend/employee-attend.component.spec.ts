import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeAttendComponent } from './employee-attend.component';

describe('EmployeeAttendComponent', () => {
  let component: EmployeeAttendComponent;
  let fixture: ComponentFixture<EmployeeAttendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeAttendComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeAttendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
