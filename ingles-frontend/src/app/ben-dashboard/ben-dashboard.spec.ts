import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BenDashboard } from './ben-dashboard';

describe('BenDashboard', () => {
  let component: BenDashboard;
  let fixture: ComponentFixture<BenDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BenDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
