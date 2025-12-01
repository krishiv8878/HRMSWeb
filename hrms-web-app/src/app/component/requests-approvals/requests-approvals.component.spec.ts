import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestsApprovalsComponent } from './requests-approvals.component';

describe('RequestsApprovalsComponent', () => {
  let component: RequestsApprovalsComponent;
  let fixture: ComponentFixture<RequestsApprovalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsApprovalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestsApprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
