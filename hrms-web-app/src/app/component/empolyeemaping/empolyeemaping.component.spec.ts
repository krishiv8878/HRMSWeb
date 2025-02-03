import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpolyeemapingComponent } from './empolyeemaping.component';

describe('EmpolyeemapingComponent', () => {
  let component: EmpolyeemapingComponent;
  let fixture: ComponentFixture<EmpolyeemapingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpolyeemapingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpolyeemapingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
