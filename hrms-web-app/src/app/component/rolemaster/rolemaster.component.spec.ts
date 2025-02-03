import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolemasterComponent } from './rolemaster.component';

describe('RolemasterComponent', () => {
  let component: RolemasterComponent;
  let fixture: ComponentFixture<RolemasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolemasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolemasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
