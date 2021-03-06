import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaquetteRoutingModule } from './maquette-routing.module';
import { MaquetteListComponent } from './components/maquette-list/maquette-list.component';
import { MaquetteDetailComponent } from './components/maquette-detail/maquette-detail.component';
import { YearDetailComponent } from './components/year-detail/year-detail.component';
import { ExtraModuleDetailComponent } from './components/extra-module-detail/extra-module-detail.component';
import { ExtraModuleItemDetailComponent } from './components/extra-module-item-detail/extra-module-item-detail.component';
import { SemesterDetailComponent } from './components/semester-detail/semester-detail.component';
import { ModuleDetailComponent } from './components/module-detail/module-detail.component';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';
import { NgxsModule } from '@ngxs/store';
import { FuseSharedModule } from '../../../@fuse/shared.module';
import {
  MatButtonModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatTabsModule,
  MatTableModule,
  MatMenuModule,
  MatDialogModule,
  MatSelectModule,
} from '@angular/material';
import { EditableModule } from '../../modules/editable/editable.module';
import { ContextMenuModule } from 'ngx-contextmenu';
import { BooleanDisplayModule } from '../../../@fuse/components/boolean-display/boolean-display.module';
import { DeleteModalModule } from '../../modules/delete-modal/delete-modal.module';
import { NewYearUiComponent } from './components/new-year-ui/new-year-ui.component';
import { CourseNewComponent } from './components/course-new/course-new.component';

@NgModule({
  declarations: [
    MaquetteListComponent,
    MaquetteDetailComponent,
    YearDetailComponent,
    ExtraModuleDetailComponent,
    ExtraModuleItemDetailComponent,
    SemesterDetailComponent,
    ModuleDetailComponent,
    CourseDetailComponent,
    NewYearUiComponent,
    CourseNewComponent,
  ],
  imports: [
    FuseSharedModule,
    MaquetteRoutingModule,
    NgxsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    EditableModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    BooleanDisplayModule,
    DeleteModalModule,
    ContextMenuModule.forRoot({
      autoFocus: true,
    }),
    MatTableModule,
    MatMenuModule,
    MatDialogModule,
  ],
})
export class MaquetteModule {}
