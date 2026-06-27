// Lightweight, fail-safe EN/ES switch for the portal's interface text.
//
// How it works: applyLang() walks a curated set of selectors and swaps each
// element's innerHTML using the dictionary below, keyed by the element's
// original (normalized) English innerHTML. The original is cached the first time
// so switching back to English restores it exactly. Anything not in the
// dictionary simply stays in English — an unmapped or mis-keyed string can never
// break the layout. Board-authored content (news, meetings, FAQ answers,
// document bodies) intentionally stays as written.

const SELECTORS = [
  '#main-nav a', '.hero-tag', '.hero h1', '.hero-sub', '.hero-cta a',
  '.qa-text small', '.qa-text strong',
  '.section-eyebrow', '.section-title', '.section-sub',
  '.resource-item h4', '.resource-item .res-link',
  '.wl-tab-btn', '.wl-step-label', '.wl-panel-desc', '.wl-field label', '.wl-hint',
  '.wl-step-nav .btn-primary', '.wl-back-btn', '.wl-submit-row .btn-primary',
  '.contact-item h4',
  '.footer-brand-name', '.footer-copy', '.footer-links a',
];

// Keys are the elements' normalized English innerHTML (note: "&" serializes as
// "&amp;", line breaks as "<br>").
export const ES = {
  // Nav + footer links
  'About': 'Nosotros',
  'Updates': 'Avisos',
  'Meetings': 'Reuniones',
  'Resources': 'Recursos',
  'Documents': 'Documentos',
  'Waiting Lists': 'Listas de espera',
  'Contact': 'Contacto',
  'Sign Up': 'Suscríbete',
  'FAQ': 'Preguntas',

  // Hero
  '🏡 Cooperative Housing · Yonkers, New York': '🏡 Vivienda cooperativa · Yonkers, Nueva York',
  'Welcome Home to<br><em>555 McLean Ave</em>': 'Bienvenido a casa a<br><em>555 McLean Ave</em>',
  'Your resident portal for building news, meetings, and community resources.':
    'Su portal de residentes para noticias del edificio, reuniones y recursos comunitarios.',
  'View Upcoming Meetings': 'Ver próximas reuniones',
  'Latest Updates': 'Últimos avisos',

  // Quick actions
  'Next Meeting': 'Próxima reunión',
  'Maintenance Request': 'Solicitud de mantenimiento',
  'Building Emergency': 'Emergencia del edificio',
  'Pay Maintenance': 'Pagar mantenimiento',
  'Open Request Form': 'Abrir formulario',
  'Parking &amp; Storage': 'Estacionamiento y almacenamiento',
  'ClickPay Portal': 'Portal ClickPay',

  // Section eyebrows
  'Who We Are': 'Quiénes somos',
  'News &amp; Notices': 'Noticias y avisos',
  'Upcoming': 'Próximamente',
  'Resident Resources': 'Recursos para residentes',
  'Resident Library': 'Biblioteca de residentes',
  'Join the Queue': 'Únase a la lista',
  'Get In Touch': 'Comuníquese',
  'Stay in the Loop': 'Manténgase informado',
  'Help': 'Ayuda',

  // Section titles
  'A Community<br>We Call Home': 'Una comunidad<br>que llamamos hogar',
  'Building Updates': 'Avisos del edificio',
  'Board Meetings': 'Reuniones de la junta',
  'Everything<br>You Need': 'Todo lo<br>que necesita',
  'Building<br>Documents': 'Documentos<br>del edificio',
  "We're Here<br>to Help": 'Estamos aquí<br>para ayudar',
  'Never Miss<br>an Update': 'No se pierda<br>ningún aviso',
  'Frequently Asked<br>Questions': 'Preguntas<br>frecuentes',

  // Section subs
  '555 McLean Ave is a resident-owned cooperative where neighbors look out for one another. Everything we do is guided by our shared commitment to a safe, welcoming building.':
    '555 McLean Ave es una cooperativa propiedad de sus residentes, donde los vecinos se cuidan entre sí. Todo lo que hacemos se guía por nuestro compromiso compartido con un edificio seguro y acogedor.',
  'Stay informed with the latest announcements from the board and managing agent.':
    'Manténgase informado con los últimos anuncios de la junta y la administración.',
  'All shareholders are welcome — and encouraged — to attend. Meeting locations are noted on each event below.':
    'Todos los accionistas son bienvenidos —y animados— a asistir. La ubicación de cada reunión se indica en cada evento.',
  'Quick access to the documents, contacts, and services that keep our building running smoothly.':
    'Acceso rápido a los documentos, contactos y servicios que mantienen nuestro edificio funcionando sin problemas.',
  'Official co-op documents for shareholders — house rules, applications, and policies.':
    'Documentos oficiales de la cooperativa para accionistas: reglas de la casa, solicitudes y políticas.',
  'Submit your information to be added to the parking or storage waiting list. The board will contact you when a spot becomes available.':
    'Envíe su información para añadirse a la lista de espera de estacionamiento o almacenamiento. La junta se comunicará con usted cuando haya un lugar disponible.',
  'Reach out to the board or managing agent for questions, maintenance requests, or anything else you need.':
    'Comuníquese con la junta o la administración para preguntas, solicitudes de mantenimiento o cualquier otra cosa que necesite.',
  'Sign up to receive building news, board meeting reminders, and community announcements directly to your inbox.':
    'Suscríbase para recibir noticias del edificio, recordatorios de reuniones y anuncios comunitarios directamente en su correo.',
  'Quick answers to the questions we hear most from shareholders and residents.':
    'Respuestas rápidas a las preguntas más frecuentes de accionistas y residentes.',

  // Resources cards
  'Pay Maintenance Online': 'Pagar mantenimiento en línea',
  'House Rules': 'Reglas de la casa',
  'Amenities &amp; Policies': 'Servicios y políticas',
  'Emergency Contacts': 'Contactos de emergencia',
  'ClickPay Setup Guide': 'Guía de ClickPay',
  'Contact the Board': 'Contactar a la junta',
  'Parking Waitlist': 'Lista de estacionamiento',
  'Storage Waitlist': 'Lista de almacenamiento',
  'Open ClickPay →': 'Abrir ClickPay →',
  'Open request form →': 'Abrir formulario →',
  'Read house rules →': 'Leer las reglas →',
  'View details →': 'Ver detalles →',
  'See contacts →': 'Ver contactos →',
  'Read the guide →': 'Leer la guía →',
  'Sign up below →': 'Regístrese abajo →',

  // Waitlist UI
  '🚗 Parking Spot': '🚗 Estacionamiento',
  '📦 Storage Unit': '📦 Almacenamiento',
  'Step 1 of 3 — Your details': 'Paso 1 de 3 — Sus datos',
  'Step 2 of 3 — Your preferences': 'Paso 2 de 3 — Sus preferencias',
  'Step 3 of 3 — Review &amp; send': 'Paso 3 de 3 — Revisar y enviar',
  'Step 1 of 2 — Your details': 'Paso 1 de 2 — Sus datos',
  'Step 2 of 2 — Review &amp; send': 'Paso 2 de 2 — Revisar y enviar',
  'Join the waiting list for an available parking space. Spots are assigned in the order requests are received.':
    'Únase a la lista de espera de un lugar de estacionamiento. Los lugares se asignan en el orden en que se reciben las solicitudes.',
  'Join the waiting list for an available storage unit. Units are assigned based on availability and request order.':
    'Únase a la lista de espera de una unidad de almacenamiento. Las unidades se asignan según disponibilidad y orden de solicitud.',
  "Here's what we'll send to the board. Go back to make changes, or send it now.":
    'Esto es lo que enviaremos a la junta. Vuelva atrás para hacer cambios, o envíelo ahora.',
  'Full Name': 'Nombre completo',
  'Apartment #': 'Apartamento #',
  'Email Address': 'Correo electrónico',
  'Phone (optional)': 'Teléfono (opcional)',
  'Spot Preference': 'Preferencia de lugar',
  'Is this your first or second spot?': '¿Es su primer o segundo lugar?',
  'Your request will be sent to the board.': 'Su solicitud se enviará a la junta.',
  'Next →': 'Siguiente →',
  'Review →': 'Revisar →',
  '← Back': '← Atrás',
  'Join Parking List →': 'Unirme a estacionamiento →',
  'Join Storage List →': 'Unirme a almacenamiento →',

  // Contact
  'Building Address': 'Dirección del edificio',
  'Managing Agent': 'Administración',
  'Board of Directors': 'Junta directiva',
  'Emergencies': 'Emergencias',

  // Footer
  '555 McLean Ave Cooperative': 'Cooperativa 555 McLean Ave',
  'Yonkers, New York · Resident-Owned Cooperative · Copyright © 2026':
    'Yonkers, Nueva York · Cooperativa de residentes · Copyright © 2026',
};

const cache = new WeakMap();
const norm = s => s.replace(/\s+/g, ' ').trim();

export function applyLang(lang) {
  document.documentElement.lang = lang;
  SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (!cache.has(el)) cache.set(el, el.innerHTML);
      const original = cache.get(el);
      if (lang === 'es') {
        const hit = ES[norm(original)];
        if (hit != null) el.innerHTML = hit;
      } else {
        el.innerHTML = original; // restore exact English
      }
    });
  });
}

// Read the saved language ('en' default). Guarded for private mode.
export function savedLang() {
  try { return localStorage.getItem('lang') === 'es' ? 'es' : 'en'; }
  catch { return 'en'; }
}

export function saveLang(lang) {
  try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
}
