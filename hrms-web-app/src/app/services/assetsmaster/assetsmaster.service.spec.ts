import { TestBed } from '@angular/core/testing';

import { AssetsmasterService } from './assetsmaster.service';

describe('AssetsmasterService', () => {
  let service: AssetsmasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetsmasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
