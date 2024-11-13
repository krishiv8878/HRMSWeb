import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { IndexComponent } from "./component/index/index.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'hrms-web-app';
  
}
