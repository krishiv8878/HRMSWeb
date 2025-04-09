import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LeaverequestComponent } from '../../modal/leaverequest/leaverequest.component';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss'
})
export class LeaveRequestComponent {
  constructor() { }

  dialog = inject(MatDialog)

  openAddForm() {
    this.dialog.open(LeaverequestComponent,{
      width: '600px',
      // height: '100vh',
      // position: { right: '0px' },
    })
   }
}
