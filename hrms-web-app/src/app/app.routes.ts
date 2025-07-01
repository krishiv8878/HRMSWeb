import { Routes } from '@angular/router';
import { HomeComponent } from './component/employee/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AboutComponent } from './component/pages/about/about.component';
import { ServicesComponent } from './component/pages/services/services.component';
import { DesignationComponent } from './component/designation/designation.component';
import { SkillComponent } from './component/skill/skill.component';
import { HolidayComponent } from './component/holiday/holiday.component';
import { CandidateComponent } from './component/candidate/candidate.component';
import { AssetsmasterComponent } from './component/assetsmaster/assetsmaster.component';
import { ProjectmasterComponent } from './component/projectmaster/projectmaster.component';
import { LeavetypeComponent } from './component/leavetype/leavetype.component';
import { IndexComponent } from './component/index/index.component';
import { ContactComponent } from './component/pages/contact/contact.component';
import { RolemasterComponent } from './component/rolemaster/rolemaster.component';
import { EmployeeAttendanceComponent } from './component/employee-attendance/employee-attendance.component';
import { PaymentinfoComponent } from './component/paymentinfo/paymentinfo.component';
import { ShiftemployeeComponent } from './component/shiftemployee/shiftemployee.component';
import { DocumentComponent } from './component/document/document.component';
import { LeaveRequestComponent } from './component/leave-request/leave-request.component';
import { UserprofileComponent } from './modal/userprofile/userprofile.component';
import { authGuard } from './auth.guard';
import { ResignationComponent } from './modal/resignation/resignation.component';
import { ResetpasswordComponent } from './modal/resetpassword/resetpassword.component';
import { ForgotpasswordComponent } from './modal/forgotpassword/forgotpassword.component';



export const routes: Routes = [
    {
        path: '', redirectTo: 'login', pathMatch: 'full'
    },
    {
        path: 'login', component: LoginComponent,
    },
    {
        path: 'register', component: RegisterComponent,
    },
    {
        path: 'reset-password', component: ResetpasswordComponent
    },
    {
        path:'forgot-password', component:ForgotpasswordComponent
    },
    {
        path: 'index', component: IndexComponent, canActivate: [authGuard], children: [

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
                path: 'designation', component: DesignationComponent
            },
            {
                path: 'skill', component: SkillComponent
            },
            {
                path: 'holiday', component: HolidayComponent
            },
            {
                path: 'candidate', component: CandidateComponent
            },
            {
                path: 'assets', component: AssetsmasterComponent
            },
            {
                path: 'project', component: ProjectmasterComponent
            },
            {
                path: 'leavetype', component: LeavetypeComponent
            },
            {
                path: 'contact', component: ContactComponent
            },
            {
                path: 'rolemaster', component: RolemasterComponent
            },
            {
                path: 'attendance', component: EmployeeAttendanceComponent
            },
            {
                path: 'paymentinfo', component: PaymentinfoComponent
            },
            {
                path: 'shift', component: ShiftemployeeComponent
            },
            {
                path: 'document', component: DocumentComponent
            },
            {
                path: 'leaveRequest', component: LeaveRequestComponent
            },
            {
                path: 'user-profile', component: UserprofileComponent
            },
            {
                path: 'resignation', component: ResignationComponent
            },
        ]
    }
];
