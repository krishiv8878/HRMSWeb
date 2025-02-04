import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolemastersComponent } from './rolemasters.component';

describe('RolemastersComponent', () => {
  let component: RolemastersComponent;
  let fixture: ComponentFixture<RolemastersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolemastersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolemastersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
