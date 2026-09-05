/* ============================================================
   Config da LP Gratificação de Função — carregada ANTES de js/main.js
   (defer em ordem). Só overrides; TODA a lógica vive em main.js.
   Webhook: mesmo endpoint das demais LPs; o campo `page` com valor
   'gratificacao-funcao' no payload permite distinguir no n8n.
   ============================================================ */
window.ARADV_PAGE = {
  page: 'gratificacao-funcao',
  campanha: 'gratificacao',
  defaultMessage:
    'Olá, Dra. Adriana! Li sobre incorporação da gratificação de função para bancários e gostaria de entender melhor a minha situação, com sigilo.',
  h1Default: 'a',
  h1Variants: {
    a: 'Trabalhou 10 anos ou mais como gerente ou em função de confiança no banco?',
    b: 'Perdeu a gratificação de função depois de anos como gerente no banco?',
    c: 'Entenda se você tem direito a manter a gratificação de função do banco'
  },
  questions: [
    { id: 'nome', label: 'Nome', type: 'text', required: true, autocomplete: 'name', placeholder: 'Como podemos te chamar?' },
    { id: 'telefone', label: 'WhatsApp para contato', type: 'tel', required: true, validate: 'phone', autocomplete: 'tel', placeholder: '(11) 99999-9999' },
    { id: 'situacao', label: 'Breve descrição da situação', type: 'textarea', required: true, full: true, placeholder: 'Ex.: cargo, tempo de função, quando foi revertido…' }
  ],
  formIntro:
    'Olá, Dra. Adriana! Vim pela página sobre gratificação de função e gostaria de entender melhor a minha situação, com sigilo.',
  webhookUrl: 'https://n8n.globalportfolio.com.br/webhook/adriana-horas-extras'
};
