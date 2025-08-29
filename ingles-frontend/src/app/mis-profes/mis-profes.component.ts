import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MisProfesService, Profesor } from './mis-profes.service';

@Component({
  selector: 'app-mis-profes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-profes.component.html',
  styleUrls: ['./mis-profes.component.css']
})
export class MisProfesComponent implements OnInit {
  profesores: Profesor[] = [];

  constructor(private misProfesService: MisProfesService) {}

  ngOnInit(): void {
    this.misProfesService.getProfesores().subscribe((data) => {
      this.profesores = data;
    });
  }
}
