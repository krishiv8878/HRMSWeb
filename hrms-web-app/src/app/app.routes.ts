import { Routes } from '@angular/router';
import { HomeComponent } from './component/home/home.component';

export const routes: Routes = [
    {
        path: '', component: HomeComponent, pathMatch: 'full'
    }
];
