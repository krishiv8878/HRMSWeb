import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { AssetsmasterService } from '../../services/assetsmaster/assetsmaster.service';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-assetsmasters',
  standalone: true,
  imports: [MatButtonModule, MatFormField, MatDialogClose, MatInputModule, CommonModule, ReactiveFormsModule, MatRadioModule, MatCheckboxModule, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './assetsmasters.component.html',
  styleUrl: './assetsmasters.component.scss'
})
export class AssetsmastersComponent {
  fomBuilder = inject(FormBuilder)
  services = inject(AssetsmasterService)
  route = inject(ActivatedRoute)
  isEdit = false;
  toaster = inject(ToastrService)

  constructor(private _dialogref: MatDialogRef<AssetsmastersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  Assets = this.fomBuilder.group({
    id: 0,
    assetsMasterName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
    description: ['',[Validators.required ]],
    serialNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
    dateOfPurchase: ['', [Validators.required]],
    isActive: [true,[Validators.required, Validators.pattern('true|false')]]
  })
  ngOnInit() {
    this.Assets.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;
    }
  }
 
  allowOnlyLetters(event: KeyboardEvent) {
    const key = event.key;
    // Allow letters and space only
    if (!/^[a-zA-Z ]$/.test(key)) {
      event.preventDefault();
    }
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    // Allow numbers and space only
    if (!/^[0-9 ]$/.test(key)) {
      event.preventDefault();
    }
  }
  
  submitdata() {
    if (this.Assets.invalid) {
      this.Assets.markAllAsTouched(); // Show errors in UI  
      const errorMessages: { [key: string]: string } = {
        assetsMasterName: "Name is Required",
        description: "Description is Required",
        serialNumber: "Serial Number is Required",
        dateOfPurchase: "Date is Required",    
        isActive:" Please select a Active Button"    
      };

      for (const field in errorMessages) {
        const control = this.Assets.get(field);
        if (control?.invalid) {
          this.toaster.error(errorMessages[field], "Validation Error");
          return;
        }
      }
    }
    if (this.isEdit) {
      this.services.updateData(this.Assets.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          this.toaster.success('successfully update data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.Assets.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          this.toaster.success('successfully add data', 'success')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
  getControl(controleName: string) {
    return this.Assets.get(controleName);
  }
}
