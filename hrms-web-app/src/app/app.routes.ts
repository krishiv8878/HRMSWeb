import { Routes } from '@angular/router';
import { HomeComponent } from './component/home/home.component';
import { LoginComponent } from './auth/login/login.component';

export const routes: Routes = [
    {
        path: '', component: HomeComponent, pathMatch: 'full'                
    },
    {
        path: 'login', component: LoginComponent, 
    }
];
