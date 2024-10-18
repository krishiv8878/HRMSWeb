import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateeComponent } from './candidate.component';

describe('CandidateComponent', () => {
  let component: CandidateeComponent;
  let fixture: ComponentFixture<CandidateeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
