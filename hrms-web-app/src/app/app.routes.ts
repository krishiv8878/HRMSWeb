import { Routes } from '@angular/router';
import { HomeComponent } from './component/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AboutComponent } from './component/pages/about/about.component';
import { ServicesComponent } from './component/pages/services/services.component';
import { DesignationComponent } from './component/designation/designation.component';
import { SkillComponent } from './component/skill/skill.component';
import { HolidayComponent } from './component/holiday/holiday.component';
import { CandidateComponent } from './component/candidate/candidate.component';
import { AssetsmasterComponent } from './component/assetsmaster/assetsmaster.component';

export const routes: Routes = [
    {
        path: '',  children: [
            {
                path: 'login', component: LoginComponent,
            },
            {
                path: 'register', component: RegisterComponent,
            },
        ]
    },
    {
        path: 'home', component: HomeComponent
    },
    {
        path: 'about', component: AboutComponent
    },
    {
        path: 'services', component: ServicesComponent
    },
    {
        path:'designation', component:DesignationComponent
    },
    {
        path:'skill', component:SkillComponent
    },
    {
        path:'holiday', component:HolidayComponent
    },
    {
        path:'candidate', component:CandidateComponent
    },
    {
        path:'assets', component:AssetsmasterComponent
    }
];
