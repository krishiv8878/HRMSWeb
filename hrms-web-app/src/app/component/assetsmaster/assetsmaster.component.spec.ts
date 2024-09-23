import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsmasterComponent } from './assetsmaster.component';

describe('AssetsmasterComponent', () => {
  let component: AssetsmasterComponent;
  let fixture: ComponentFixture<AssetsmasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetsmasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetsmasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
