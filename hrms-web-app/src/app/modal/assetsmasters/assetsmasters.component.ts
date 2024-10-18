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

@Component({
  selector: 'app-assetsmasters',
  standalone: true,
  imports: [MatButtonModule, MatFormField,MatDialogClose, MatInputModule, CommonModule, ReactiveFormsModule, MatRadioModule, MatCheckboxModule, MatDatepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './assetsmasters.component.html',
  styleUrl: './assetsmasters.component.scss'
})
export class AssetsmastersComponent {
  fomBuilder = inject(FormBuilder)
  services = inject(AssetsmasterService)
  route = inject(ActivatedRoute)
  isEdit = false;


  constructor(private _dialogref: MatDialogRef<AssetsmastersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  Assets = this.fomBuilder.group({
    id: 0,
    assetsMasterName: ['', [Validators.required]],
    description: ['', [Validators.required]],
    serialNumber: ['', [Validators.required]],
    dateOfPurchase: ['', [Validators.required, Validators.maxLength(10)]],
    createdBy: ['', [Validators.required]],
    createdDate: ['', [Validators.required]],
    updatedBy: ['',[Validators.required]],
    updatedDate:['',[Validators.required]],
    isActive: ['']
  })
  ngOnInit() {
    this.Assets.patchValue(this.data);
    if (this.data) {
      this.isEdit = true;     
    }
  }
  submitdata() {    
    if (this.isEdit) {
      this.services.updateData(this.Assets.value).subscribe({
        next: (val: any) => {
          // console.log('update successfully')
          alert("data updated successfully")
          this._dialogref.close(true);
        }, error: (err) => {
          console.log("err msg", err)
        }
      })
    } else {
      this.services.createData(this.Assets.value).subscribe({
        next: (val: any) => {
          // console.log("successfully add")
          alert('data add successfully')
          this._dialogref.close(true);
        }, error: (err) => {
          console.log(err)
        }
      })
    }
  }
}
