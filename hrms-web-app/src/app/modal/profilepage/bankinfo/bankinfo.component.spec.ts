import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankinfoComponent } from './bankinfo.component';

describe('BankinfoComponent', () => {
  let component: BankinfoComponent;
  let fixture: ComponentFixture<BankinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankinfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
