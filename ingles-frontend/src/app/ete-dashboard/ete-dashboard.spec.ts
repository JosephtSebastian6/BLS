import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EteDashboard } from './ete-dashboard';

describe('EteDashboard', () => {
  let component: EteDashboard;
  let fixture: ComponentFixture<EteDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EteDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EteDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
