import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendaseditComponent } from './attendasedit.component';

describe('AttendaseditComponent', () => {
  let component: AttendaseditComponent;
  let fixture: ComponentFixture<AttendaseditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendaseditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendaseditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
