import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'new', loadComponent: () => import('./features/application/application').then(m => m.Application) },
  { path: 'track', loadComponent: () => import('./features/tracking/tracking').then(m => m.Tracking) },
];