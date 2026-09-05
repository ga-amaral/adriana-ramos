/* ============================================================
   Config da LP Burnout — carregado ANTES de js/main.js (defer em ordem).
   Só overrides; TODA a lógica (scroll, validação, máscara, webhook,
   consentimento, FAQ) vive em main.js e é compartilhada.
   Webhook: mesmo endpoint de horas extras; o campo `page: 'burnout'`
   no payload permite distinguir no n8n. Se o volume justificar,
   criar webhook dedicado e trocar `webhookUrl` aqui (1 linha).
   ============================================================ */
window.ARADV_PAGE = {
  page: 'burnout',
  campanha: 'burnout',
  defaultMessage:
    'Olá, Dra. Adriana! Li sobre Burnout e metas abusivas no trabalho e gostaria de entender melhor a minha situação, com sigilo.',
  h1Default: 'a',
  h1Variants: {
    a: 'Está esgotado(a) por causa das metas do seu trabalho?',
    b: 'Burnout causado pelo trabalho pode ser reconhecido como doença?',
    c: 'Entenda seus direitos se o seu esgotamento tem relação com o trabalho'
  },
  questions: [
    { id: 'nome', label: 'Nome', type: 'text', required: true, autocomplete: 'name', placeholder: 'Como podemos te chamar?' },
    { id: 'telefone', label: 'WhatsApp para contato', type: 'tel', required: true, validate: 'phone', autocomplete: 'tel', placeholder: '(11) 99999-9999' },
    { id: 'situacao', label: 'Breve descrição da situação', type: 'textarea', required: true, full: true, placeholder: 'Ex.: sua função, há quanto tempo sente esgotamento…' }
  ],
  formIntro:
    'Olá, Dra. Adriana! Vim pela página sobre Burnout e metas abusivas e gostaria de entender melhor a minha situação, com sigilo.',
  webhookUrl: 'https://n8n.globalportfolio.com.br/webhook/adriana-horas-extras'
};
