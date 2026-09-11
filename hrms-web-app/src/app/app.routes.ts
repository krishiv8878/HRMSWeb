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
import { roleGuard } from './core/role.guard';
import { ResignationComponent } from './modal/resignation/resignation.component';
import { ResetpasswordComponent } from './modal/resetpassword/resetpassword.component';
import { ForgotpasswordComponent } from './modal/forgotpassword/forgotpassword.component';
import { RequestsApprovalsComponent } from './component/requests-approvals/requests-approvals.component';
import { TimesheetComponent } from './component/timesheet/timesheet.component';

export const routes: Routes = [
    {
        path: '', redirectTo: 'index/document', pathMatch: 'full'
    },
    {
        path: 'login', component: LoginComponent
    },
    {
        path: 'register', component: RegisterComponent
    },
    {
        path: 'reset-password', component: ResetpasswordComponent
    },
    {
        path: 'forgot-password', component: ForgotpasswordComponent
    },
    {
        path: 'index', component: IndexComponent, canActivate: [authGuard], children: [
            {
                path: '', redirectTo: 'document', pathMatch: 'full'
            },
            {
                path: 'home', component: HomeComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management'] }
            },
            {
                path: 'about', component: AboutComponent
            },
            {
                path: 'services', component: ServicesComponent
            },
            {
                path: 'designation', component: DesignationComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
            },
            {
                path: 'skill', component: SkillComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
            },
            {
                path: 'holiday', component: HolidayComponent
            },
            {
                path: 'candidate', component: CandidateComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
            },
            {
                path: 'assets', component: AssetsmasterComponent
            },
            {
                path: 'project', component: ProjectmasterComponent
            },
            {
                path: 'leavetype', component: LeavetypeComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
            },
            {
                path: 'contact', component: ContactComponent
            },
            {
                path: 'rolemaster', component: RolemasterComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin'] }
            },
            {
                path: 'attendance', component: EmployeeAttendanceComponent
            },
            {
                path: 'paymentinfo', component: PaymentinfoComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
            },
            {
                path: 'shift', component: ShiftemployeeComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations'] }
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
            {
                path: 'request', component: RequestsApprovalsComponent, canActivate: [roleGuard], data: { roles: ['Admin', 'System Admin', 'HR', 'HR Operations', 'Manager', 'Management'] }
            },
            {
                path: 'timesheet', component: TimesheetComponent
            }
        ]
    }
];
