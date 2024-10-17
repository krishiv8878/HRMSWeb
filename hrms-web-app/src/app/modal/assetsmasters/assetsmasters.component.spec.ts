import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsmastersComponent } from './assetsmasters.component';

describe('AssetsmastersComponent', () => {
  let component: AssetsmastersComponent;
  let fixture: ComponentFixture<AssetsmastersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsmastersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsmastersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
