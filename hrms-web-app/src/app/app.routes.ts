import { Routes } from '@angular/router';
import { HomeComponent } from './component/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AboutComponent } from './component/pages/about/about.component';
import { ServicesComponent } from './component/pages/services/services.component';

export const routes: Routes = [
    {
        path: '', redirectTo: "login", pathMatch: 'full'
    },
    {
        path: 'home', component: HomeComponent
    },
    {
        path: 'login', component: LoginComponent,
    },
    {
        path: 'register', component: RegisterComponent,
    },
    {
        path: 'about', component: AboutComponent
    },
    {
        path: 'services', component: ServicesComponent
    }
];
