export const environment = {
  /**
   * Vazio: as chamadas saem para `/api/...` na mesma origem. Em desenvolvimento,
   * o `proxy.conf.json` do `ng serve` repassa para a API em `localhost:8080`, sem
   * precisar liberar CORS na API.
   */
  apiBaseUrl: '',
};
