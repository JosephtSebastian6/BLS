import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpDashboard } from './exp-dashboard';

describe('ExpDashboard', () => {
  let component: ExpDashboard;
  let fixture: ComponentFixture<ExpDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
