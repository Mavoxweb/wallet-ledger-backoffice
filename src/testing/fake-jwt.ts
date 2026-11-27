/** Monta um JWT sem assinatura válida: o app só lê o payload, quem confere é a API. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(value)))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${base64url('{"alg":"HS256","typ":"JWT"}')}.${base64url(JSON.stringify(payload))}.assinatura`;
}
