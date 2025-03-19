import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendancerequestComponent } from './attendancerequest.component';

describe('AttendancerequestComponent', () => {
  let component: AttendancerequestComponent;
  let fixture: ComponentFixture<AttendancerequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendancerequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendancerequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
