import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IefDashboard } from './ief-dashboard';

describe('IefDashboard', () => {
  let component: IefDashboard;
  let fixture: ComponentFixture<IefDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IefDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IefDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
