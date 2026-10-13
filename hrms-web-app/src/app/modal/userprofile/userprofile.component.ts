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

export interface ProfileFieldItem {
  id: string;
  fieldKey: string;
  label: string;
  category: 'Personal' | 'Emergency' | 'Education' | 'Experience' | 'Banking' | 'Identity';
  section?: string;
  isCompleted: boolean;
  isComplete?: boolean;
  actionModal: 'info' | 'contact' | 'education' | 'experience' | 'bankinfo' | 'passportinfo';
  actionPrompt: string;
  icon: string;
  currentValue?: string;
}

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

  // Profile Completeness System
  profileCompleteness: number = 0;
  completenessInfo = {
    percentage: 0,
    completedFields: 0,
    totalFields: 0,
    pendingFields: 0
  };
  mandatoryFieldsList: ProfileFieldItem[] = [];
  pendingFieldsList: ProfileFieldItem[] = [];
  completedFieldsList: ProfileFieldItem[] = [];
  completenessFilter: 'pending' | 'completed' | 'all' = 'pending';

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
      this.calculateProfileCompleteness();
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
      this.calculateProfileCompleteness();
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
    // 1. Direct from Database Responsibilities JSON
    if (this.employedata?.responsibilities) {
      try {
        const parsed = JSON.parse(this.employedata.responsibilities);
        if (Array.isArray(parsed.educations) && parsed.educations.length > 0) {
          return parsed.educations;
        }
      } catch (e) {}
    }

    // 2. Fallback to localStorage
    const id = this.employedata?.id || 'default';
    const saved = this.getStorage('profile_educations_' + id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // 3. Fallback to primary columns in Database
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

  isJsonString(val: any): boolean {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  getExperiencesList(): ExperienceEntry[] {
    // 1. Direct from Database Responsibilities JSON
    if (this.employedata?.responsibilities) {
      try {
        const parsed = JSON.parse(this.employedata.responsibilities);
        if (Array.isArray(parsed.experiences) && parsed.experiences.length > 0) {
          return parsed.experiences.map((item: any) => ({
            ...item,
            responsibilities: this.isJsonString(item.responsibilities) ? '' : (item.responsibilities || '')
          }));
        }
      } catch (e) {}
    }

    // 2. Fallback to localStorage
    const id = this.employedata?.id || 'default';
    const saved = this.getStorage('profile_experiences_' + id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            responsibilities: this.isJsonString(item.responsibilities) ? '' : (item.responsibilities || '')
          }));
        }
      } catch (e) {}
    }

    if (this.employedata?.companyName) {
      let resp = this.employedata.responsibilities || '';
      if (this.isJsonString(resp)) {
        try {
          const parsed = JSON.parse(resp);
          resp = parsed.workResponsibilities || '';
        } catch {
          resp = '';
        }
      }
      return [
        {
          companyName: this.employedata.companyName,
          designation: this.employedata.designation || '',
          experienceStartDate: null,
          experienceEndDate: null,
          experienceDuration: this.employedata.experienceDuration || '',
          experienceLocation: this.employedata.experienceLocation || '',
          responsibilities: resp
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

  // ==========================================
  // Profile Completeness & Action Methods
  // ==========================================

  openPendingModal(action: 'info' | 'contact' | 'education' | 'experience' | 'bankinfo' | 'passportinfo') {
    switch (action) {
      case 'info':
        this.info(this.employedata);
        break;
      case 'contact':
        this.contact(this.employedata);
        break;
      case 'education':
        this.education(this.employedata);
        break;
      case 'experience':
        this.experience(this.employedata);
        break;
      case 'bankinfo':
        this.bankinfo(this.paymentdata);
        break;
      case 'passportinfo':
        this.passportinfo(this.employedata);
        break;
    }
  }

  setCompletenessFilter(filter: 'pending' | 'completed' | 'all') {
    this.completenessFilter = filter;
  }

  isSectionComplete(categoryOrSection: string): boolean {
    const norm = (categoryOrSection || '').toLowerCase();
    const secFields = this.mandatoryFieldsList.filter(f => {
      const cat = f.category.toLowerCase();
      return cat === norm || (norm === 'passport' && cat === 'identity');
    });
    return secFields.length > 0 && secFields.every(f => f.isCompleted);
  }

  getSectionPendingCount(categoryOrSection: string): number {
    const norm = (categoryOrSection || '').toLowerCase();
    return this.mandatoryFieldsList.filter(f => {
      const cat = f.category.toLowerCase();
      const match = cat === norm || (norm === 'passport' && cat === 'identity');
      return match && !f.isCompleted;
    }).length;
  }

  isFieldPending(fieldKey: string): boolean {
    const item = this.mandatoryFieldsList.find(f => f.fieldKey === fieldKey || f.id === fieldKey);
    return item ? !item.isCompleted : false;
  }

  calculateProfileCompleteness(): void {
    const emp = this.employedata || {};
    const pay = this.paymentdata || {};
    const educations = this.getEducationsList();
    const experiences = this.getExperiencesList();

    const isVal = (v: any) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—' && String(v).trim() !== 'Not Specified' && String(v).trim() !== '0';

    const fields: ProfileFieldItem[] = [
      {
        id: 'legalName',
        fieldKey: 'firstName',
        label: 'First & Last Legal Name',
        category: 'Personal',
        isCompleted: isVal(emp.firstName) && isVal(emp.lastName),
        actionModal: 'info',
        actionPrompt: 'Fill Legal Name',
        icon: 'badge',
        currentValue: isVal(emp.firstName) ? `${emp.firstName} ${emp.lastName || ''}`.trim() : undefined
      },
      {
        id: 'emailAddress',
        fieldKey: 'emailAddress',
        label: 'Corporate Email Address',
        category: 'Personal',
        isCompleted: isVal(emp.emailAddress),
        actionModal: 'info',
        actionPrompt: 'Add Corporate Email',
        icon: 'mail',
        currentValue: emp.emailAddress
      },
      {
        id: 'mobileNumber',
        fieldKey: 'mobileNumber',
        label: 'Primary Mobile Contact',
        category: 'Personal',
        isCompleted: isVal(emp.mobileNumber),
        actionModal: 'info',
        actionPrompt: 'Add Mobile Phone',
        icon: 'phone',
        currentValue: emp.mobileNumber
      },
      {
        id: 'gender',
        fieldKey: 'gender',
        label: 'Gender Designation',
        category: 'Personal',
        isCompleted: isVal(emp.gender) && emp.gender !== 'Not Specified',
        actionModal: 'info',
        actionPrompt: 'Specify Gender',
        icon: 'wc',
        currentValue: emp.gender
      },
      {
        id: 'dateOfBirth',
        fieldKey: 'dateOfBirth',
        label: 'Date of Birth',
        category: 'Personal',
        isCompleted: isVal(emp.dateOfBirth),
        actionModal: 'info',
        actionPrompt: 'Set Date of Birth',
        icon: 'cake',
        currentValue: emp.dateOfBirth
      },
      {
        id: 'currentAddress',
        fieldKey: 'currentAddress',
        label: 'Current Residential Address',
        category: 'Personal',
        isCompleted: isVal(emp.currentAddress),
        actionModal: 'info',
        actionPrompt: 'Add Current Address',
        icon: 'home',
        currentValue: emp.currentAddress
      },
      {
        id: 'permanentAddress',
        fieldKey: 'permanentAddress',
        label: 'Permanent Domicile Address',
        category: 'Personal',
        isCompleted: isVal(emp.permanentAddress),
        actionModal: 'info',
        actionPrompt: 'Add Permanent Domicile',
        icon: 'location_city',
        currentValue: emp.permanentAddress
      },
      {
        id: 'emergencyContactName',
        fieldKey: 'primaryContactName',
        label: 'Primary Emergency Contact Person',
        category: 'Emergency',
        isCompleted: isVal(emp.primaryContactName),
        actionModal: 'contact',
        actionPrompt: 'Add Emergency Contact',
        icon: 'contact_phone',
        currentValue: emp.primaryContactName
      },
      {
        id: 'emergencyContactPhone',
        fieldKey: 'primaryContactPhone',
        label: 'Emergency Contact Phone Number',
        category: 'Emergency',
        isCompleted: isVal(emp.primaryContactPhone),
        actionModal: 'contact',
        actionPrompt: 'Add Emergency Phone',
        icon: 'ring_volume',
        currentValue: emp.primaryContactPhone
      },
      {
        id: 'emergencyContactRel',
        fieldKey: 'primaryContactRelationship',
        label: 'Emergency Responder Relationship',
        category: 'Emergency',
        isCompleted: isVal(emp.primaryContactRelationship),
        actionModal: 'contact',
        actionPrompt: 'Specify Relationship',
        icon: 'people',
        currentValue: emp.primaryContactRelationship
      },
      {
        id: 'bankName',
        fieldKey: 'bankName',
        label: 'Salary Bank Institution Name',
        category: 'Banking',
        isCompleted: isVal(pay.bankName),
        actionModal: 'bankinfo',
        actionPrompt: 'Add Bank Name',
        icon: 'account_balance',
        currentValue: pay.bankName
      },
      {
        id: 'accountNumber',
        fieldKey: 'accountNumber',
        label: 'Direct Deposit Account Number',
        category: 'Banking',
        isCompleted: isVal(pay.accountNumber),
        actionModal: 'bankinfo',
        actionPrompt: 'Enter Account Number',
        icon: 'tag',
        currentValue: pay.accountNumber
      },
      {
        id: 'ifscCode',
        fieldKey: 'ifscCode',
        label: 'Bank Branch IFSC Code',
        category: 'Banking',
        isCompleted: isVal(pay.ifscCode),
        actionModal: 'bankinfo',
        actionPrompt: 'Enter IFSC Code',
        icon: 'domain_verification',
        currentValue: pay.ifscCode
      },
      {
        id: 'education',
        fieldKey: 'education',
        label: 'Educational Degree & College',
        category: 'Education',
        isCompleted: isVal(emp.degree) || isVal(emp.university) || educations.length > 0,
        actionModal: 'education',
        actionPrompt: 'Add Degree & College',
        icon: 'school',
        currentValue: emp.degree || (educations.length > 0 ? educations[0].degree : undefined)
      },
      {
        id: 'experience',
        fieldKey: 'experience',
        label: 'Previous Professional Experience',
        category: 'Experience',
        isCompleted: isVal(emp.companyName) || experiences.length > 0,
        actionModal: 'experience',
        actionPrompt: 'Add Work History',
        icon: 'work_history',
        currentValue: emp.companyName || (experiences.length > 0 ? experiences[0].companyName : undefined)
      },
      {
        id: 'identity',
        fieldKey: 'identity',
        label: 'Passport or National Identity ID',
        category: 'Identity',
        isCompleted: isVal(emp.passportNumber) || isVal(emp.nationality),
        actionModal: 'passportinfo',
        actionPrompt: 'Add Identity Details',
        icon: 'fingerprint',
        currentValue: emp.passportNumber || emp.nationality
      }
    ];

    this.mandatoryFieldsList = fields.map(f => ({
      ...f,
      section: f.category,
      isComplete: f.isCompleted
    }));
    this.completedFieldsList = this.mandatoryFieldsList.filter(f => f.isCompleted);
    this.pendingFieldsList = this.mandatoryFieldsList.filter(f => !f.isCompleted);

    this.profileCompleteness = Math.round((this.completedFieldsList.length / this.mandatoryFieldsList.length) * 100);
    this.completenessInfo = {
      percentage: this.profileCompleteness,
      completedFields: this.completedFieldsList.length,
      totalFields: this.mandatoryFieldsList.length,
      pendingFields: this.pendingFieldsList.length
    };

    if (this.employedata) {
      this.employedata.profileCompleted = this.profileCompleteness >= 100;
      this.employedata.profileCompleteness = this.profileCompleteness;
    }
  }
}
