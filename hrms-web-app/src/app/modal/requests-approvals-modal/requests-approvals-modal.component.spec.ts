import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestsApprovalsModalComponent } from './requests-approvals-modal.component';

describe('RequestsApprovalsModalComponent', () => {
  let component: RequestsApprovalsModalComponent;
  let fixture: ComponentFixture<RequestsApprovalsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsApprovalsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestsApprovalsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
