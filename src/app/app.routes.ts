import { Routes } from '@angular/router';
import { guestGuard, staffGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Entrar · Wallet Ledger',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [staffGuard],
    loadComponent: () => import('./core/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'contas' },
      {
        path: 'contas',
        title: 'Contas · Wallet Ledger',
        loadComponent: () =>
          import('./features/accounts/accounts.page').then((m) => m.AccountsPage),
      },
      {
        path: 'contas/:id',
        title: 'Conta · Wallet Ledger',
        loadComponent: () =>
          import('./features/account-detail/account-detail.page').then((m) => m.AccountDetailPage),
      },
      {
        path: 'auditoria',
        title: 'Auditoria · Wallet Ledger',
        loadComponent: () => import('./features/audit/audit.page').then((m) => m.AuditPage),
      },
    ],
  },
  { path: '**', redirectTo: 'contas' },
];
