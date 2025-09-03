import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpcDashboard } from './ipc-dashboard';

describe('IpcDashboard', () => {
  let component: IpcDashboard;
  let fixture: ComponentFixture<IpcDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpcDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpcDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
