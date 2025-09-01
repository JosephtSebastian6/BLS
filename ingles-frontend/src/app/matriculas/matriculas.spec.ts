import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Matriculas } from './matriculas';

describe('Matriculas', () => {
  let component: Matriculas;
  let fixture: ComponentFixture<Matriculas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Matriculas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Matriculas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
