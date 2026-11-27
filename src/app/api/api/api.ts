export * from './account.service';
import { AccountService } from './account.service';
export * from './auth.service';
import { AuthService } from './auth.service';
export * from './backoffice-accounts.service';
import { BackofficeAccountsService } from './backoffice-accounts.service';
export * from './backoffice-audit.service';
import { BackofficeAuditService } from './backoffice-audit.service';
export * from './backoffice-transactions.service';
import { BackofficeTransactionsService } from './backoffice-transactions.service';
export * from './charges.service';
import { ChargesService } from './charges.service';
export * from './deposits.service';
import { DepositsService } from './deposits.service';
export * from './me.service';
import { MeService } from './me.service';
export * from './pix-keys.service';
import { PixKeysService } from './pix-keys.service';
export * from './transfers.service';
import { TransfersService } from './transfers.service';
export const APIS = [
  AccountService,
  AuthService,
  BackofficeAccountsService,
  BackofficeAuditService,
  BackofficeTransactionsService,
  ChargesService,
  DepositsService,
  MeService,
  PixKeysService,
  TransfersService,
];
