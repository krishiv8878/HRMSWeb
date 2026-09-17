import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { EmployeeService } from '../../services/employee/employee.service';
import { PaymentinfoService } from '../../services/employeePayment/paymentinfo.service';
import { SkillservicesService } from '../../services/skill/skillservices.service';

import { InformationComponent } from '../profilepage/information/information.component';
import { EmergencyComponent } from '../profilepage/emergency/emergency.component';
import { EducationDetailsComponent, EducationEntry } from '../profilepage/education-details/education-details.component';
import { ExperienceComponent, ExperienceEntry } from '../profilepage/experience/experience.component';
import { PaymeenInfoComponent } from '../paymeen-info/paymeen-info.component';
import { PassportinfoComponent } from '../profilepage/passportinfo/passportinfo.component';

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
  private dialog = inject(MatDialog);
  private toaster = inject(ToastrService);

  employedata: any = null;
  paymentdata: any = null;
  skillsList: any[] = [];
  profileImageUrl: string = '';
  showAccountSecret: boolean = false;
  activeTab: string = 'overview';

  ngOnInit() {
    this.services.avatar$.subscribe(av => {
      if (av) {
        this.profileImageUrl = av;
      }
    });

    this.services.userProfile$.subscribe(profile => {
      if (profile && (profile.firstName || profile.lastName || profile.fullName) && this.employedata) {
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
    if (initial) {
      this.profileImageUrl = initial;
    }

    this.getData();
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
    const userId = this.getStorage('employeeId');
    const storedName = this.getStorage('UserName') || 'Sarah Jenkins';

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
    const userId = this.getStorage('employeeId');

    const handleBankResult = (pay: any) => {
      if (pay) {
        this.paymentdata = pay;
      } else {
        this.paymentdata = {
          id: 0,
          employeeId: Number(userId || 0),
          nameOnAccount: `${this.employedata?.firstName || 'Sarah'} ${this.employedata?.lastName || 'Jenkins'}`,
          accountNumber: '4829104928194',
          bankName: 'JPMorgan Chase Bank, N.A.',
          ifscCode: 'CHASUS33',
          branch: 'New York Financial Center',
          isVerified: true,
          isMock: true
        };
      }
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
    const first = parts[0] || 'Sarah';
    const last = parts.slice(1).join(' ') || 'Jenkins';

    return {
      id: 1,
      employeeCode: 'EMP-00148',
      firstName: first,
      lastName: last,
      emailAddress: `${first.toLowerCase()}.${last.toLowerCase()}@krishiv.com`,
      mobileNumber: '+1 (555) 234-5678',
      dateOfJoining: '2023-03-15',
      dateOfBirth: '1992-06-24',
      gender: 'Female',
      designation: 'Principal Solutions Architect',
      department: 'Engineering & Cloud Architecture',
      currentAddress: '742 Evergreen Terrace, Suite 400, New York, NY 10001',
      permanentAddress: '1204 Pine Ridge Road, Boston, MA 02108',
      skills: ['Angular', 'TypeScript', '.NET Core', 'Microservices', 'Azure', 'Docker', 'System Design'],
      isActive: true,
      managerName: 'Alexander Vance (VP Engineering)',
      primaryContactName: 'Robert Jenkins',
      primaryContactRelationship: 'Spouse',
      primaryContactPhone: '+1 (555) 876-5432',
      primaryEmailAddress: 'robert.jenkins@example.com',
      primaryContactAddress: '742 Evergreen Terrace, Suite 400, New York, NY 10001',
      secondaryContactName: 'Eleanor Vance',
      secondaryContactRelationship: 'Mother',
      secondaryContactPhone: '+1 (555) 345-6789',
      secondaryContactEmail: 'eleanor.vance@example.com',
      secondaryContactAddress: '1204 Pine Ridge Road, Boston, MA 02108',
      degree: 'Master of Science in Computer Science',
      university: 'Massachusetts Institute of Technology (MIT)',
      yearOfPassing: 2016,
      percentage: 88.5,
      companyName: 'Nexient Global Solutions',
      experienceDuration: '5 Years 8 Months',
      experienceLocation: 'Boston, MA',
      responsibilities: 'Led cross-functional cloud transformation, microservices migration, CI/CD pipeline automation, and team mentoring.',
      passportNumber: 'N849201948',
      nationality: 'United States',
      passportIssueDate: '2020-04-12',
      passportExpiryDate: '2030-04-11',
      passportScanCopy: 'Verified & Encrypted on File'
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
        return this.employedata.skills;
      }
    }
    return ['Angular', 'TypeScript', '.NET Core', 'C#', 'SQL Server', 'Azure Cloud', 'Docker', 'RESTful APIs'];
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
          degree: this.employedata?.degree || 'Master of Science in Computer Science',
          university: this.employedata?.university || 'Massachusetts Institute of Technology (MIT)',
          yearOfPassing: this.employedata?.yearOfPassing || '2016',
          percentage: this.employedata?.percentage || '3.92 GPA / Magna Cum Laude'
        },
        {
          degree: 'Bachelor of Science in Information Technology',
          university: 'Boston University College of Engineering',
          yearOfPassing: '2014',
          percentage: '3.85 GPA / First Class Honors'
        }
      ];
    }

    return [
      {
        degree: 'Master of Science in Computer Science',
        university: 'Massachusetts Institute of Technology (MIT)',
        yearOfPassing: '2016',
        percentage: '3.92 GPA / Magna Cum Laude'
      },
      {
        degree: 'Bachelor of Science in Information Technology',
        university: 'Boston University College of Engineering',
        yearOfPassing: '2014',
        percentage: '3.85 GPA / First Class Honors'
      }
    ];
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
          companyName: this.employedata?.companyName || 'Nexient Global Solutions',
          designation: 'Lead Cloud & Systems Architect',
          experienceStartDate: null,
          experienceEndDate: null,
          experienceDuration: this.employedata?.experienceDuration || '5 Years 8 Months',
          experienceLocation: this.employedata?.experienceLocation || 'Boston, MA',
          responsibilities: this.employedata?.responsibilities || 'Led cross-functional cloud transformation, microservices migration, CI/CD pipeline automation, and team mentoring.'
        },
        {
          companyName: 'Vertex Interactive Systems',
          designation: 'Senior Full Stack Developer',
          experienceStartDate: null,
          experienceEndDate: null,
          experienceDuration: '3 Years 2 Months',
          experienceLocation: 'Cambridge, MA',
          responsibilities: 'Engineered high-throughput REST APIs in .NET Core, architected Angular client portals, and optimized SQL Server database indices.'
        }
      ];
    }

    return [
      {
        companyName: 'Nexient Global Solutions',
        designation: 'Lead Cloud & Systems Architect',
        experienceStartDate: null,
        experienceEndDate: null,
        experienceDuration: '5 Years 8 Months',
        experienceLocation: 'Boston, MA',
        responsibilities: 'Led cross-functional cloud transformation, microservices migration, CI/CD pipeline automation, and team mentoring.'
      },
      {
        companyName: 'Vertex Interactive Systems',
        designation: 'Senior Full Stack Developer',
        experienceStartDate: null,
        experienceEndDate: null,
        experienceDuration: '3 Years 2 Months',
        experienceLocation: 'Cambridge, MA',
        responsibilities: 'Engineered high-throughput REST APIs in .NET Core, architected Angular client portals, and optimized SQL Server database indices.'
      }
    ];
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
    const dialogRef = this.dialog.open(PaymeenInfoComponent, {
      width: '600px',
      data: data || this.paymentdata
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadBankInfo();
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
}
