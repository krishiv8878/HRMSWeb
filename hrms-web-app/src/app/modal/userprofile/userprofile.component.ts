import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeService } from '../../services/employee/employee.service';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { SkillservicesService } from '../../services/skill/skillservices.service';
import { RbacService } from '../../core/rbac.service';

import { InformationComponent } from '../profilepage/information/information.component';
import { EmergencyComponent } from '../profilepage/emergency/emergency.component';
import { EducationDetailsComponent, EducationEntry } from '../profilepage/education-details/education-details.component';
import { ExperienceComponent, ExperienceEntry } from '../profilepage/experience/experience.component';
import { PaymeenInfoComponent } from '../paymeen-info/paymeen-info.component';
import { PassportinfoComponent } from '../profilepage/passportinfo/passportinfo.component';
import { CtcBreakdownModalComponent } from '../ctc-breakdown/ctc-breakdown-modal.component';
import { SalarySlipModalComponent } from '../salary-slip-modal/salary-slip-modal.component';

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './userprofile.component.html',
  styleUrl: './userprofile.component.scss'
})
export class UserprofileComponent implements OnInit {
  private services = inject(EmployeeService);
  private paymentservices = inject(PaymentinfoService);
  private skillservices = inject(SkillservicesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);
  private rbacService = inject(RbacService);

  employedata: any = null;
  paymentdata: any = null;
  skillsList: any[] = [];
  profileImageUrl: string = '';
  showAccountSecret: boolean = false;
  activeTab: string = 'overview';

  targetEmployeeId: number | null = null;
  isViewingOtherEmployee: boolean = false;
  isAdminOrHr: boolean = false;
  ctcBreakdown: any = null;
  disbursementsList: any[] = [];

  ngOnInit() {
    this.isAdminOrHr = this.rbacService.hasAnyRole(['Admin', 'System Admin', 'HR', 'HR Operations']);

    this.services.avatar$.subscribe(av => {
      if (av && !this.isViewingOtherEmployee) {
        this.profileImageUrl = av;
      }
    });

    this.services.userProfile$.subscribe(profile => {
      if (!this.isViewingOtherEmployee && profile && (profile.firstName || profile.lastName || profile.fullName) && this.employedata) {
        if (profile.firstName) this.employedata.firstName = profile.firstName;
        if (profile.lastName) this.employedata.lastName = profile.lastName;
        if (profile.fullName) {
          this.employedata.fullName = profile.fullName;
          this.employedata.name = profile.fullName;
        }
        if (profile.email) this.employedata.emailAddress = profile.email;
      }
    });

    const initial = this.services.getProfileAvatar();
    if (initial && !this.isViewingOtherEmployee) {
      this.profileImageUrl = initial;
    }

    this.route.queryParams.subscribe(params => {
      const qId = params['id'] || params['employeeId'];
      const currentUserId = this.getStorage('employeeId');
      if (qId && Number(qId) > 0 && String(qId) !== String(currentUserId)) {
        this.isViewingOtherEmployee = true;
        this.targetEmployeeId = Number(qId);
      } else {
        this.isViewingOtherEmployee = false;
        this.targetEmployeeId = currentUserId ? Number(currentUserId) : null;
      }
      this.getData();
    });
  }

  private getStorage(key: string): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  getData() {
    const userId = this.targetEmployeeId || this.getStorage('employeeId');
    const storedName = this.isViewingOtherEmployee ? 'Employee' : (this.getStorage('UserName') || 'Sarah Jenkins');

    const handleProfileResult = (emp: any) => {
      if (emp) {
        this.employedata = emp;
      } else {
        this.employedata = this.getDefaultMockProfile(storedName);
      }

      if (this.employedata?.profileImage) {
        const apiBase = (this.services as any).apiUrl || '';
        this.profileImageUrl = this.employedata.profileImage.startsWith('http') || this.employedata.profileImage.startsWith('data:')
          ? this.employedata.profileImage
          : apiBase.replace('/api', '') + '/ProfileImages/' + this.employedata.profileImage;
        this.services.setProfileAvatar(this.profileImageUrl);
      } else if (!this.profileImageUrl) {
        const globalAv = this.services.getProfileAvatar();
        if (globalAv) {
          this.profileImageUrl = globalAv;
        }
      }

      this.parseCtcBreakdown();
      this.loadSkills();
      this.loadBankInfo();
    };

    if (userId) {
      this.services.getEmployeeById(userId).subscribe({
        next: (res: any) => {
          const emp = res?.data || res;
          if (emp && emp.id) {
            handleProfileResult(emp);
          } else {
            // fallback to list if user has permission
            this.services.getData().subscribe({
              next: (listRes: any) => {
                const list = Array.isArray(listRes) ? listRes : (listRes?.data || []);
                const found = list.find((e: any) => e.id == userId);
                handleProfileResult(found);
              },
              error: () => handleProfileResult(null)
            });
          }
        },
        error: () => {
          this.services.getData().subscribe({
            next: (listRes: any) => {
              const list = Array.isArray(listRes) ? listRes : (listRes?.data || []);
              const found = list.find((e: any) => e.id == userId);
              handleProfileResult(found);
            },
            error: () => handleProfileResult(null)
          });
        }
      });
    } else {
      this.services.getData().subscribe({
        next: (response: any) => {
          const list = Array.isArray(response) ? response : (response?.data || []);
          handleProfileResult(list.length > 0 ? list[0] : null);
        },
        error: () => handleProfileResult(null)
      });
    }
  }

  private loadBankInfo() {
    const userId = this.employedata?.id || this.targetEmployeeId || this.getStorage('employeeId');

    const handleBankResult = (pay: any) => {
      this.paymentdata = pay || null;
    };

    if (userId) {
      this.paymentservices.getByEmployeeId(userId).subscribe({
        next: (res: any) => {
          const pay = res?.data || res;
          if (pay && (pay.employeeId || pay.id)) {
            handleBankResult(pay);
          } else {
            this.paymentservices.getAllData().subscribe({
              next: (allRes: any) => {
                const list = Array.isArray(allRes) ? allRes : (allRes?.data || []);
                const found = list.find((p: any) => p.employeeId == userId);
                handleBankResult(found);
              },
              error: () => handleBankResult(null)
            });
          }
        },
        error: () => {
          this.paymentservices.getAllData().subscribe({
            next: (allRes: any) => {
              const list = Array.isArray(allRes) ? allRes : (allRes?.data || []);
              const found = list.find((p: any) => p.employeeId == userId);
              handleBankResult(found);
            },
            error: () => handleBankResult(null)
          });
        }
      });
    } else {
      this.paymentservices.getAllData().subscribe({
        next: (response: any) => {
          const list = Array.isArray(response) ? response : (response?.data || []);
          handleBankResult(list.length > 0 ? list[0] : null);
        },
        error: () => handleBankResult(null)
      });
    }
  }

  private loadSkills() {
    this.skillservices.getSkill().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.skillsList = response;
        } else if (response && Array.isArray(response.data)) {
          this.skillsList = response.data;
        }
      }
    });
  }

  private getDefaultMockProfile(fullName: string): any {
    const parts = fullName.split(' ');
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    const email = this.getStorage('UserEmail') || '';
    const empId = this.targetEmployeeId || this.getStorage('employeeId') || 0;

    return {
      id: Number(empId),
      employeeCode: empId ? `EMP-00${empId}` : '',
      firstName: first,
      lastName: last,
      emailAddress: email,
      mobileNumber: '',
      dateOfJoining: null,
      dateOfBirth: null,
      gender: '',
      designation: '',
      department: '',
      currentAddress: '',
      permanentAddress: '',
      skills: '',
      isActive: true,
      managerName: '',
      primaryContactName: '',
      primaryContactRelationship: '',
      primaryContactPhone: '',
      primaryEmailAddress: '',
      primaryContactAddress: '',
      secondaryContactName: '',
      secondaryContactRelationship: '',
      secondaryContactPhone: '',
      secondaryContactEmail: '',
      secondaryContactAddress: '',
      degree: '',
      university: '',
      yearOfPassing: null,
      percentage: null,
      companyName: '',
      experienceDuration: '',
      experienceLocation: '',
      responsibilities: '',
      passportNumber: '',
      nationality: '',
      passportIssueDate: null,
      passportExpiryDate: null,
      passportScanCopy: ''
    };
  }

  getInitials(): string {
    if (!this.employedata) return 'EP';
    const first = (this.employedata.firstName || '').trim();
    const last = (this.employedata.lastName || '').trim();
    return ((first[0] || '') + (last[0] || '')).toUpperCase() || 'EP';
  }

  getSkillsArray(): string[] {
    if (this.employedata?.skills) {
      if (typeof this.employedata.skills === 'string') {
        return this.employedata.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      if (Array.isArray(this.employedata.skills)) {
        return this.employedata.skills.filter(Boolean);
      }
    }
    return [];
  }

  getEducationsList(): EducationEntry[] {
    const id = this.employedata?.id || 'default';
    const saved = this.getStorage('profile_educations_' + id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    if (this.employedata?.degree || this.employedata?.university) {
      return [
        {
          degree: this.employedata?.degree || '',
          university: this.employedata?.university || '',
          yearOfPassing: this.employedata?.yearOfPassing ? String(this.employedata.yearOfPassing) : '',
          percentage: this.employedata?.percentage ? String(this.employedata.percentage) : ''
        }
      ];
    }

    return [];
  }

  getExperiencesList(): ExperienceEntry[] {
    const id = this.employedata?.id || 'default';
    const saved = this.getStorage('profile_experiences_' + id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    if (this.employedata?.companyName) {
      return [
        {
          companyName: this.employedata.companyName,
          designation: this.employedata.designation || '',
          experienceStartDate: null,
          experienceEndDate: null,
          experienceDuration: this.employedata.experienceDuration || '',
          experienceLocation: this.employedata.experienceLocation || '',
          responsibilities: this.employedata.responsibilities || ''
        }
      ];
    }

    return [];
  }

  toggleAccountSecret() {
    this.showAccountSecret = !this.showAccountSecret;
  }

  getMaskedAccount(acc: string): string {
    if (!acc) return '•••• •••• ••••';
    if (this.showAccountSecret) return acc;
    const clean = acc.toString().trim();
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    return `•••• •••• ${last4}`;
  }

  info(data: any) {
    const dialogRef = this.dialog.open(InformationComponent, {
      width: '620px',
      data: data || this.employedata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getData();
    });
  }

  contact(data: any) {
    const dialogRef = this.dialog.open(EmergencyComponent, {
      width: '620px',
      data: data || this.employedata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getData();
    });
  }

  education(data: any) {
    const dialogRef = this.dialog.open(EducationDetailsComponent, {
      width: '640px',
      data: data || this.employedata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getData();
    });
  }

  experience(data: any) {
    const dialogRef = this.dialog.open(ExperienceComponent, {
      width: '640px',
      data: data || this.employedata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getData();
    });
  }

  bankinfo(data: any) {
    const targetId = this.employedata?.id || this.targetEmployeeId || this.getStorage('employeeId');
    const fullName = (this.employedata?.firstName ? (this.employedata.firstName + ' ' + (this.employedata.lastName || '')) : '').trim();
    const existing = data || this.paymentdata;
    const dialogData = existing
      ? { ...existing, employeeId: existing.employeeId || targetId, nameOnAccount: existing.nameOnAccount || fullName }
      : { employeeId: targetId, nameOnAccount: fullName };

    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '600px',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadBankInfo();
    });
  }

  viewPayslip(disb: any) {
    this.dialog.open(SalarySlipModalComponent, {
      width: '850px',
      maxHeight: '90vh',
      data: {
        disbursement: disb,
        employee: this.employedata,
        paymentInfo: this.paymentdata
      }
    });
  }

  passportinfo(data: any) {
    const dialogRef = this.dialog.open(PassportinfoComponent, {
      width: '600px',
      data: data || this.employedata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getData();
    });
  }

  parseCtcBreakdown(): void {
    if (this.employedata?.responsibilities) {
      try {
        const parsed = JSON.parse(this.employedata.responsibilities);
        if (parsed) {
          if (parsed.annualCtc || parsed.basicSalary) {
            this.ctcBreakdown = parsed;
          }
          if (Array.isArray(parsed.disbursements)) {
            this.disbursementsList = parsed.disbursements;
          } else {
            this.disbursementsList = [];
          }
          return;
        }
      } catch {
        // Text is not JSON
      }
    }
    this.ctcBreakdown = null;
    this.disbursementsList = [];
  }

  editCtcBreakdown(): void {
    const dialogRef = this.dialog.open(CtcBreakdownModalComponent, {
      width: '640px',
      data: {
        employee: this.employedata,
        employeeId: this.employedata?.id || this.targetEmployeeId,
        ctcBreakdown: this.ctcBreakdown
      }
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res) {
        this.ctcBreakdown = res;
        if (this.employedata) {
          this.employedata.responsibilities = JSON.stringify(res);
        }
      }
    });
  }

  backToDirectory(): void {
    this.router.navigate(['/index/home']);
  }

  formatCurrency(val: number): string {
    return '₹ ' + (val || 0).toLocaleString('en-IN');
  }

  formatLpa(val: number): string {
    if (!val) return '0 LPA';
    return (val / 100000).toFixed(2) + ' LPA';
  }
}
