import { TestBed } from '@angular/core/testing';

import { SkillservicesService } from './skillservices.service';

describe('SkillservicesService', () => {
  let service: SkillservicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkillservicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
