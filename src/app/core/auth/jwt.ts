export type StaffOrCustomerRole = 'Customer' | 'Operator' | 'Admin';

export interface Claims {
  role: StaffOrCustomerRole;
  name: string;
  /** Expiração em milissegundos desde a época (como `Date.now()`). */
  expiresAt: number | null;
}

const ROLES: readonly string[] = ['Customer', 'Operator', 'Admin'];

/**
 * Lê o payload do access token. Não confere a assinatura: isso é trabalho da API,
 * que recusa qualquer token adulterado. Aqui o perfil só decide o que a tela mostra.
 */
export function readClaims(token: string): Claims | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const role = json['role'];
    if (typeof role !== 'string' || !ROLES.includes(role)) {
      return null;
    }
    const exp = json['exp'];
    return {
      role: role as StaffOrCustomerRole,
      name: typeof json['name'] === 'string' ? json['name'] : '',
      expiresAt: typeof exp === 'number' ? exp * 1000 : null,
    };
  } catch {
    return null;
  }
}
