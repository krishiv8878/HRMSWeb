import { TestBed } from '@angular/core/testing';

import { ResignationService } from './resignation.service';

describe('ResignationService', () => {
  let service: ResignationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResignationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
