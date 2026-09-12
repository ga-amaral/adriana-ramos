/* ============================================================
   main.js — LÓGICA COMPARTILHADA das LPs (vanilla, modular leve)
   Responsabilidades: links/CTA, H1 A/B, formulário, dataLayer/eventos,
   webhook, consentimento LGPD, ano automático.
   Multi-página: js/config-<pagina>.js (carregado ANTES, defer em ordem)
   define window.ARADV_PAGE com overrides — merge raso abaixo.
   Sem PII no dataLayer. Sem innerHTML com dados externos.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    page: 'horas-extras',
    campanha: 'Horas Extras',
    whatsappNumber: '5594984264945',
    whatsappDisplay: '(94) 98426-4945',
    defaultMessage:
      'Olá, Dra. Adriana! Li sobre horas extras (7ª e 8ª hora) para cargo de confiança em banco e gostaria de entender melhor a minha situação, com sigilo.',
    h1Default: 'a',
    h1Variants: {
      a: 'Trabalha como gerente ou especialista no banco e faz mais de 6 horas por dia?',
      b: 'Seu cargo de confiança no banco é real ou só no papel?',
      c: 'Entenda se você tem direito às horas extras da 7ª e 8ª hora no banco'
    },
    consentKey: 'aradv_consent_v1',
    /* ==========================================================
       FORMULÁRIO (seção 10.2 da nota). PLACEHOLDER — cliente vai
       definir as perguntas exatas. Para editar: ajuste este array.
       Tipos suportados: 'text' | 'tel' | 'email' | 'textarea'.
       validate: 'phone' valida DDD+numero BR (10–11 dígitos,
       com ou sem 55). required marca campo obrigatório.
       ========================================================== */
    questions: [
      { id: 'nome', label: 'Nome', type: 'text', required: true, autocomplete: 'name', placeholder: 'Como podemos te chamar?' },
      { id: 'telefone', label: 'WhatsApp para contato', type: 'tel', required: true, validate: 'phone', autocomplete: 'tel', placeholder: '(11) 99999-9999' },
      { id: 'situacao', label: 'Breve descrição da situação', type: 'textarea', required: true, full: true, placeholder: 'Ex.: cargo, jornada diária, há quanto tempo…' }
    ],
    formIntro:
      'Olá, Dra. Adriana! Vim pela página sobre horas extras (7ª e 8ª hora) e gostaria de entender melhor a minha situação, com sigilo.',
    // Webhook do escritório (n8n): recebe os dados do formulário via POST JSON.
    // Fire-and-forget com keepalive — nunca bloqueia a abertura do WhatsApp.
    webhookUrl: 'https://n8n.globalportfolio.com.br/webhook/adriana-horas-extras'
  };

  /* Merge raso: arrays/objetos da página (questions, h1Variants) substituem
     por completo; resto usa default. Sem ARADV_PAGE = página horas extras. */
  var CONFIG = Object.assign({}, DEFAULTS, window.ARADV_PAGE || {});

  window.ARADV = window.ARADV || {};
  window.ARADV.config = CONFIG;
  window.dataLayer = window.dataLayer || [];

  function getH1Variant() {
    try {
      var params = new URLSearchParams(window.location.search);
      var v = (params.get('h1') || '').toLowerCase();
      if (v === 'a' || v === 'b' || v === 'c') return v;
    } catch (e) { /* mantém padrão */ }
    return CONFIG.h1Default;
  }

  function buildWaLink(location) {
    var text = encodeURIComponent(CONFIG.defaultMessage);
    return (
      'https://wa.me/' + CONFIG.whatsappNumber +
      '?text=' + text
    );
  }

  function pushEvent(location, h1variant) {
    // Nunca enviar PII (nome, telefone, mensagem) ao analytics.
    window.dataLayer.push({
      event: 'whatsapp_click',
      cta_location: location || 'unknown',
      page_path: window.location.pathname,
      h1_variant: h1variant || CONFIG.h1Default
    });
  }

  function applyH1() {
    var variant = getH1Variant();
    var el = document.getElementById('hero-h1');
    if (el && CONFIG.h1Variants[variant]) {
      el.textContent = CONFIG.h1Variants[variant];
    }
    document.body.setAttribute('data-h1-variant', variant);
    // QA: variação do H1 (teste A/B) visível só no console — nunca em texto renderizado.
    if (window.console && typeof window.console.info === 'function') {
      window.console.info('[ARADV] H1 variant ativa: ' + variant + ' (troque com ?h1=a|b|c)');
    }
    return variant;
  }

  /* ---------- CTAs -> rolam até o formulário (o wa.me direto vive SÓ no submit) ----------
     Todos os [data-wa-cta] levam a #contact-form com scroll + foco no 1º campo.
     Sem JS, o href estático (wa.me) segue como fallback. Em páginas sem o
     formulário (ex.: política), mantém o comportamento wa.me original. */
  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function scrollToForm(form) {
    if (form && typeof form.scrollIntoView === 'function') {
      form.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
      /* Watchdog: em alguns navegadores a animação de smooth scroll pode
         iniciar e travar no meio do caminho sem completar (não é "não
         se mover", é "parar de se mover"). Por isso comparamos a posição
         de CHEGADA (form perto do topo da viewport), não a de partida.
         Se não chegou perto do topo em 700ms, força o salto instantâneo,
         ignorando explicitamente o `scroll-behavior` herdado do CSS
         (que é o que trava) via estilo inline de maior especificidade —
         o CTA nunca pode falhar. */
      window.setTimeout(function () {
        /* Posição de chegada ESPERADA = scroll-margin-top (o CSS desloca o
           repouso final para baixo do header fixo). Sem isso, o watchdog
           dispararia em todo scroll bem-sucedido (top final ~84px > 24px). */
        var expectedTop = 0;
        try {
          var cs = window.getComputedStyle ? window.getComputedStyle(form) : null;
          if (cs && cs.scrollMarginTop) expectedTop = parseFloat(cs.scrollMarginTop) || 0;
        } catch (e) { /* mantém 0 */ }
        var top = form.getBoundingClientRect().top;
        if (Math.abs(top - expectedTop) > 24) {
          var htmlEl = document.documentElement;
          var prevBehavior = htmlEl.style.scrollBehavior;
          htmlEl.style.scrollBehavior = 'auto';
          form.scrollIntoView({ behavior: 'auto', block: 'start' });
          htmlEl.style.scrollBehavior = prevBehavior;
        }
      }, 700);
    }
    var first = form ? form.querySelector('input, textarea, select') : null;
    if (first && typeof first.focus === 'function') {
      window.setTimeout(function () {
        try { first.focus({ preventScroll: true }); }
        catch (e) { first.focus(); }
      }, prefersReducedMotion() ? 0 : 850);
    }
  }

  function wireCtas(h1variant) {
    var form = document.getElementById('contact-form');
    var links = document.querySelectorAll('[data-wa-cta]');
    links.forEach(function (a) {
      var loc = a.getAttribute('data-wa-cta') || 'unknown';
      if (!form) {
        // Fallback (página sem formulário): wa.me direto, como antes.
        a.href = buildWaLink(loc);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
        if (!a.hasAttribute('data-wa-bound')) {
          a.setAttribute('data-wa-bound', '1');
          a.addEventListener('click', function () {
            pushEvent(loc, h1variant);
          });
        }
        return;
      }
      a.setAttribute('href', '#contact-form');
      a.removeAttribute('target');
      a.removeAttribute('rel');
      if (!a.hasAttribute('data-wa-bound')) {
        a.setAttribute('data-wa-bound', '1');
        a.addEventListener('click', function (e) {
          e.preventDefault();
          window.dataLayer.push({
            event: 'scroll_to_form',
            cta_location: loc,
            page_path: window.location.pathname,
            h1_variant: h1variant || CONFIG.h1Default
          });
          scrollToForm(form);
        });
      }
    });
    var telLinks = document.querySelectorAll('[data-wa-phone]');
    telLinks.forEach(function (el) {
      el.textContent = CONFIG.whatsappDisplay;
    });
  }

  /* ---------- Consentimento LGPD ---------- */
  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONFIG.consentKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveConsent(status) {
    var payload = {
      status: status, // 'accepted' | 'rejected'
      version: 1,
      date: new Date().toISOString()
    };
    try { window.localStorage.setItem(CONFIG.consentKey, JSON.stringify(payload)); } catch (e) {}
    window.dataLayer.push({
      event: 'consent_update',
      consent_status: status
    });
    // Hook GTM (modo de consentimento) — ativado quando o GTM real for instalado:
    // gtag('consent', 'update', { analytics_storage: status === 'accepted' ? 'granted' : 'denied', ad_storage: status === 'accepted' ? 'granted' : 'denied' });
    return payload;
  }
  function initConsent() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;
    var existing = readConsent();
    if (!existing) banner.classList.add('is-visible');
    var accept = document.getElementById('cookie-accept');
    var reject = document.getElementById('cookie-reject');
    if (accept) accept.addEventListener('click', function () {
      saveConsent('accepted');
      banner.classList.remove('is-visible');
    });
    if (reject) reject.addEventListener('click', function () {
      saveConsent('rejected');
      banner.classList.remove('is-visible');
    });
    var reopen = document.getElementById('cookie-reopen');
    if (reopen) reopen.addEventListener('click', function (e) {
      e.preventDefault();
      banner.classList.add('is-visible');
    });
  }

  function initYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function initFaqSingleOpen() {
    // Mantém <details> nativo (funciona sem JS); com JS, abre só um por vez.
    var items = document.querySelectorAll('.faq details');
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) {
          items.forEach(function (other) {
            if (other !== d && other.open) other.removeAttribute('open');
          });
        }
      });
    });
  }

  /* ---------- Formulário → WhatsApp (sem backend) ---------- */
  function isValidPhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return /^(55)?\d{10,11}$/.test(digits);
  }

  function renderFormFields(container) {
    CONFIG.questions.forEach(function (q) {
      var wrap = document.createElement('div');
      wrap.className = 'form-field' + (q.full ? ' form-field--full' : '');

      var label = document.createElement('label');
      label.setAttribute('for', 'f-' + q.id);
      label.textContent = q.label + (q.required ? ' *' : '');

      var input = q.type === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');
      if (q.type !== 'textarea') input.setAttribute('type', q.type || 'text');
      input.id = 'f-' + q.id;
      input.name = q.id;
      if (q.placeholder) input.setAttribute('placeholder', q.placeholder);
      if (q.autocomplete) input.setAttribute('autocomplete', q.autocomplete);
      /* Obrigatoriedade SÓ na validação customizada (validateField): não usar o
         atributo nativo `required` para nunca disparar a bolha nativa do
         navegador — só nossos erros inline. AT recebe aria-required. */
      if (q.required) input.setAttribute('aria-required', 'true');
      if (q.type === 'tel') input.setAttribute('inputmode', 'tel');
      input.setAttribute('aria-describedby', 'f-' + q.id + '-err');

      var err = document.createElement('p');
      err.className = 'form-error';
      err.id = 'f-' + q.id + '-err';

      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(err);
      container.appendChild(wrap);
    });
  }

  function setStatus(kind, message) {
    var box = document.getElementById('form-status');
    if (!box) return;
    box.hidden = !message;
    box.className = 'form-status' + (kind ? ' form-status--' + kind : '');
    box.textContent = message || '';
  }

  function validateField(q, input) {
    var err = document.getElementById('f-' + q.id + '-err');
    var value = input.value.trim();
    var message = '';
    if (q.required && !value) {
      message = 'Por favor, preencha este campo.';
    } else if (value && q.validate === 'phone' && !isValidPhone(value)) {
      message = 'Informe um telefone válido com DDD, ex.: (94) 98426-4945.';
    }
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) err.textContent = message;
    return message;
  }

  function buildFormMessage(values) {
    var lines = [CONFIG.formIntro, ''];
    CONFIG.questions.forEach(function (q) {
      lines.push(q.label + ': ' + (values[q.id] || '—'));
    });
    return lines.join('\n');
  }

  /* Envia os dados ao webhook do escritório SEM bloquear o usuário: dispara o
     fetch (keepalive p/ sobreviver à abertura da aba do WhatsApp) e segue o
     fluxo imediatamente. Falha de rede = só console.warn; o WhatsApp já leva
     a mensagem completa, então não há perda de informação. */
  function sendToWebhook(values, h1variant) {
    if (!CONFIG.webhookUrl || typeof window.fetch !== 'function') return;
    var payload = {};
    CONFIG.questions.forEach(function (q) {
      payload[q.id] = values[q.id] || '';
    });
    payload.page = CONFIG.page || 'horas-extras';
    payload.campanha = CONFIG.campanha || 'horas extras';
    payload.page_path = window.location.pathname;
    payload.h1_variant = h1variant || CONFIG.h1Default;
    payload.timestamp = new Date().toISOString();
    try {
      window.fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function (err) {
        if (window.console && typeof window.console.warn === 'function') {
          window.console.warn('[ARADV] webhook indisponível; seguindo para o WhatsApp.', err);
        }
      });
    } catch (err) { /* segue o fluxo normalmente */ }
  }

  /* Máscara BR progressiva: só dígitos, máx 11. Digitação normal (do início
     ao fim) mantém o cursor no final naturalmente; edição no meio do número
     pode reposicionar o cursor — limitação aceita para o fluxo comum. */
  function maskPhone(value) {
    var d = String(value || '').replace(/\D/g, '').slice(0, 11);
    var len = d.length;
    if (len === 0) return '';
    var out = '(' + d.substring(0, 2);
    if (len < 3) return out;
    out += ') ';
    if (len <= 10) {
      out += d.substring(2, 6);
      if (len > 6) out += '-' + d.substring(6);
    } else {
      out += d.substring(2, 7);
      out += '-' + d.substring(7);
    }
    return out;
  }

  function initContactForm(h1variant) {
    var form = document.getElementById('contact-form');
    var container = document.getElementById('form-fields');
    if (!form || !container) return;
    form.noValidate = true; /* reforço via JS ao novalidate do HTML */
    renderFormFields(container);

    // Máscara em tempo real + validação progressiva ao digitar.
    container.addEventListener('input', function (e) {
      var input = e.target;
      var q = CONFIG.questions.filter(function (x) { return 'f-' + x.id === input.id; })[0];
      if (!q) return;
      if (q.validate === 'phone') {
        var masked = maskPhone(input.value);
        if (masked !== input.value) input.value = masked;
      }
      validateField(q, input);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {};
      var firstInvalid = null;
      CONFIG.questions.forEach(function (q) {
        var input = document.getElementById('f-' + q.id);
        var raw = input.value.trim();
        // Telefone: wa.me e webhook recebem SÓ dígitos; a máscara é visual.
        values[q.id] = q.validate === 'phone' ? raw.replace(/\D/g, '') : raw;
        if (validateField(q, input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        setStatus('error', 'Verifique os campos destacados e tente novamente.');
        firstInvalid.focus();
        return;
      }
      var url = 'https://wa.me/' + CONFIG.whatsappNumber +
        '?text=' + encodeURIComponent(buildFormMessage(values));
      sendToWebhook(values, h1variant);
      window.dataLayer.push({
        event: 'whatsapp_click',
        cta_location: 'form_cta_final',
        page_path: window.location.pathname,
        h1_variant: h1variant || CONFIG.h1Default
      });
      setStatus('success', 'Mensagem pronta! Abrimos o WhatsApp — é só apertar enviar por lá.');
      window.open(url, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var h1variant = applyH1();
    wireCtas(h1variant);
    initContactForm(h1variant);
    initConsent();
    initYear();
    initFaqSingleOpen();
    document.body.classList.add('has-sticky');
  });
})();
