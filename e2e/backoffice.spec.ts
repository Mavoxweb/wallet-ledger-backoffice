import { APIRequestContext, expect, Page, request, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const API = 'http://localhost:8080/api/v1';
const PASSWORD = 'Demo@1234';

async function apiLogin(api: APIRequestContext, email: string): Promise<string> {
  const response = await api.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/contas$/);
}

async function openAna(page: Page): Promise<void> {
  await page.getByLabel('Buscar contas').fill('ana@walletledger.dev');
  const row = page.getByRole('link', { name: 'Ana Beatriz Lima' });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByRole('heading', { name: 'Ana Beatriz Lima' })).toBeVisible();
}

test.describe.serial('backoffice da operação', () => {
  test('cliente não entra no backoffice', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('ana@walletledger.dev');
    await page.getByLabel('Senha').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Este acesso é só para a equipe de operação.',
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test('operador bloqueia a Ana, o Pix dela é recusado e a auditoria registra', async ({
    page,
  }) => {
    const api = await request.newContext();
    // Sessão do app da Ana, aberta antes do bloqueio.
    const anaToken = await apiLogin(api, 'ana@walletledger.dev');
    const reason = `E2E ${randomUUID().slice(0, 8)}: bloqueio preventivo.`;

    await signIn(page, 'operador@walletledger.dev');
    await openAna(page);
    await expect(page.getByRole('button', { name: 'Estornar', exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Bloquear conta', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bloquear a conta de Ana?', exact: true });
    await expect(dialog).toContainText('não vai conseguir enviar nem receber Pix');
    const confirm = dialog.getByRole('button', { name: 'Bloquear conta', exact: true });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Motivo/).fill(reason);
    await confirm.click();

    await expect(page.getByText('Conta bloqueada: não envia nem recebe Pix.')).toBeVisible();

    // A lista guardada mostra o mesmo status, sem precisar buscar de novo.
    await page.getByRole('link', { name: 'Contas', exact: true }).first().click();
    await expect(page.getByRole('row').filter({ hasText: 'Ana Beatriz Lima' })).toContainText(
      'Bloqueada',
    );

    // O app da Ana, com o token que já tinha, não consegue mais fazer Pix.
    const pix = await api.post(`${API}/transfers/pix`, {
      headers: { Authorization: `Bearer ${anaToken}`, 'Idempotency-Key': randomUUID() },
      data: { keyType: 'email', keyValue: 'bruno@walletledger.dev', amountCents: 100 },
    });
    expect(pix.status()).toBe(422);
    expect((await pix.json()).code).toBe('account_not_active');

    await page.getByRole('link', { name: 'Auditoria', exact: true }).click();
    const entry = page.getByRole('row').filter({ hasText: reason });
    await expect(entry).toContainText('Bloqueio');
    await expect(entry).toContainText('Operador Demo');
    await expect(entry).toContainText('Ana Beatriz Lima');
    await expect(entry).toContainText('Ativa → Bloqueada');

    // Deixa a Ana ativa de novo, também pela tela.
    await entry.getByRole('link').click();
    await page.getByRole('button', { name: 'Desbloquear conta', exact: true }).click();
    const unblock = page.getByRole('dialog', { name: 'Desbloquear a conta de Ana?', exact: true });
    await unblock.getByLabel(/Motivo/).fill('E2E: identidade confirmada.');
    await unblock.getByRole('button', { name: 'Desbloquear conta', exact: true }).click();
    await expect(unblock).toBeHidden();
    await expect(page.getByText('Conta bloqueada: não envia nem recebe Pix.')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Bloquear conta', exact: true })).toBeVisible();
    await api.dispose();
  });

  test('admin estorna um Pix e o item fica "Estornada"', async ({ page }) => {
    const api = await request.newContext();
    const anaToken = await apiLogin(api, 'ana@walletledger.dev');
    const description = `E2E ${randomUUID().slice(0, 8)}`;
    const pix = await api.post(`${API}/transfers/pix`, {
      headers: { Authorization: `Bearer ${anaToken}`, 'Idempotency-Key': randomUUID() },
      data: {
        keyType: 'email',
        keyValue: 'bruno@walletledger.dev',
        amountCents: 100,
        description,
      },
    });
    expect(pix.status()).toBe(201);
    await api.dispose();

    await signIn(page, 'admin@walletledger.dev');
    await openAna(page);
    const balanceBefore = await page.locator('.balance-value').innerText();

    const row = page
      .getByRole('row')
      .filter({ hasText: description })
      .filter({ hasText: 'Pix enviado' });
    await row.getByRole('button', { name: /Estornar/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Estornar este Pix?', exact: true });
    await expect(dialog).toContainText('Bruno C. D. devolve para Ana Beatriz Lima');
    await dialog.getByLabel(/Motivo/).fill('E2E: Pix enviado por engano.');
    await dialog.getByRole('button', { name: 'Estornar R$ 1,00', exact: true }).click();

    await expect(row).toContainText('Estornada');
    await expect(row.getByRole('button', { name: /Estornar/ })).toHaveCount(0);
    await expect(
      page.getByRole('row').filter({ hasText: `Estorno: ${description}` }),
    ).toContainText('Estorno devolvido por Bruno C. D.');
    await expect(page.locator('.balance-value')).not.toHaveText(balanceBefore);
  });
});
