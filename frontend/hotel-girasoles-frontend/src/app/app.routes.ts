import { Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard';
import { ShellComponent } from './layout/shell/shell';
import { RoomsComponent } from './pages/rooms/rooms';
import { ReservationsComponent } from './pages/reservations/reservations';
import { ReservationFormComponent } from './pages/reservation-form/reservation-form';

import { ProductsComponent } from './pages/products/products';
import { ConsumptionsComponent } from './pages/consumptions/consumptions';
import { PersonalExpensesComponent } from './pages/personal-expenses/personal-expenses';
import { CashComponent } from './pages/cash/cash';

import { AdminRoomsComponent } from './pages/admin-room/admin-room';
import { LoginComponent } from './pages/login/login';

import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],


    children: [

      {
        path: '',
        component: DashboardComponent
      },

      {
        path: 'rooms',
        component: RoomsComponent
      },

      {
        path: 'admin/rooms',
        component: AdminRoomsComponent,
        canActivate: [adminGuard]
      },

      {
        path: 'reservations/new',
        component: ReservationFormComponent
      },

      {
        path: 'reservations',
        component: ReservationsComponent
      },

      {
        path: 'products',
        component: ProductsComponent,
        canActivate: [adminGuard]
      },

      {
        path: 'consumptions',
        component: ConsumptionsComponent
      },

      {
        path: 'personal-expenses',
        component: PersonalExpensesComponent
      },

      {
        path: 'cash',
        component: CashComponent
      }

    ]


  },

  {
    path: '**',
    redirectTo: 'login'
  }

];
