import { ChangeDetectionStrategy, Component, inject, PendingTasks, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { SessionStore, StaffOnlyError } from '../../core/auth/session.store';
import {
  isNetworkError,
  NETWORK_MESSAGE,
  problemCode,
  UNEXPECTED_MESSAGE,
} from '../../core/errors/problem';
import { BrandMark } from '../../core/ui/brand-mark';

@Component({
  selector: 'wl-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, BrandMark],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
  });
  readonly error = signal('');
  readonly busy = signal(false);

  submit(): void {
    // Tarefa pendente: o Angular (e os testes) sabem que a tela ainda está mudando.
    this.pendingTasks.run(() => this.signIn());
  }

  private async signIn(): Promise<void> {
    const { email, password } = this.form.getRawValue();
    if (!email.trim() || !password) {
      this.error.set('Informe o e-mail e a senha.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.login(email.trim(), password);
      await this.router.navigateByUrl('/contas');
    } catch (error: unknown) {
      this.error.set(this.messageFor(error));
    } finally {
      this.busy.set(false);
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof StaffOnlyError) {
      return 'Este acesso é só para a equipe de operação. Clientes usam o app Wallet Ledger.';
    }
    if (isNetworkError(error)) {
      return NETWORK_MESSAGE;
    }
    return problemCode(error) === 'invalid_credentials'
      ? 'E-mail ou senha incorretos.'
      : UNEXPECTED_MESSAGE;
  }
}
