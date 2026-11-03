/* ==========================================================
   Собрано — скрипты сайта
   ========================================================== */

// Контакты и отправка заявок — поменяйте на свои
const CONFIG = {
  telegram: 'sobranoru',          // юзернейм без @
  email: 'senyasule@yandex.ru',
  // Google Apps Script (tools/telegram-leads.gs), пересылает заявки в Telegram.
  // Пока пусто — форма откроет письмо с заполненной заявкой.
  formEndpoint: 'https://script.google.com/macros/s/AKfycbwxt695TMEJis5lL3rBPPfHCQgLHG_ZI2ie85LQIvIaLlwgsBlZEqlyB0b7uRoIUAY1AQ/exec',
};

document.documentElement.classList.add('js');

// Сайт нельзя встроить в чужую страницу (защита от кликджекинга)
if (window.top !== window.self) window.top.location = window.self.location.href;

/* ---------- Контакты ---------- */
document.querySelectorAll('[data-contact]').forEach((link) => {
  const type = link.dataset.contact;
  if (type === 'telegram') link.href = `https://t.me/${CONFIG.telegram}`;
  if (type === 'email') link.href = `mailto:${CONFIG.email}`;
  if (type === 'telegram') link.target = '_blank';
});
document.querySelectorAll('[data-contact-label]').forEach((el) => {
  const type = el.dataset.contactLabel;
  if (type === 'telegram') el.textContent = `@${CONFIG.telegram}`;
  if (type === 'email') el.textContent = CONFIG.email;
});

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Шапка и меню ---------- */
const header = document.querySelector('.header');
const burger = document.querySelector('.burger');
const menu = document.getElementById('mobile-menu');

const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const setMenu = (open) => {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menu.hidden = !open;
};
burger.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* Подсветка текущего раздела в навигации */
const navLinks = [...document.querySelectorAll('.nav a')];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}

/* ---------- Появление блоков ---------- */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  // Небольшая задержка для соседних элементов, чтобы блоки «собирались» по очереди
  reveals.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 70}ms`;
    io.observe(el);
  });
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}

/* ---------- Масштаб макета устройств в первом экране ---------- */
const stage = document.querySelector('.stage');
if (stage) {
  const fit = () => stage.style.setProperty('--stage-scale', stage.clientWidth / 520);
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
  else window.addEventListener('resize', fit);
}

/* ---------- Уведомление об отправке ---------- */
const toast = document.querySelector('.toast');
const TOAST_MS = 4000; // сколько секунд плашка видна
let toastTimer;

function showToast() {
  toast.innerHTML = '<span class="toast__icon"><svg width="14" height="14"><use href="#check"/></svg></span>'
    + '<b>Заявка доставлена</b>';
  toast.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-shown'), TOAST_MS);
}

/* ---------- Форма заявки ---------- */
const form = document.getElementById('lead-form');
const status = form.querySelector('.form__status');
const button = form.querySelector('button[type="submit"]');

// Отправить заявку можно только после согласия на обработку персональных данных
const syncSubmit = () => { button.disabled = !form.elements.consent.checked; };
form.elements.consent.addEventListener('change', syncSubmit);
syncSubmit();

const SEND_INTERVAL = 30 * 1000; // не чаще одной заявки в 30 секунд
let lastSent = 0;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Ловушка для спам-ботов: живой человек это скрытое поле не видит и не заполняет
  if (form.elements.website.value) {
    form.reset();
    return;
  }
  if (Date.now() - lastSent < SEND_INTERVAL) {
    status.className = 'form__status';
    status.textContent = 'Заявка уже отправлена. Если нужно что-то добавить — напишите нам в Telegram.';
    return;
  }

  let valid = true;
  ['name', 'contact'].forEach((name) => {
    const input = form.elements[name];
    const ok = input.value.trim().length > 1;
    input.closest('.field').classList.toggle('is-invalid', !ok);
    if (!ok && valid) input.focus();
    valid = valid && ok;
  });
  const consent = form.elements.consent;
  consent.closest('.consent').classList.toggle('is-invalid', !consent.checked);
  if (!consent.checked && valid) consent.focus();
  valid = valid && consent.checked;
  if (!valid) return;

  const data = {
    services: [...form.querySelectorAll('input[name="service"]:checked')].map((i) => i.value),
    name: form.elements.name.value.trim().slice(0, 100),
    contact: form.elements.contact.value.trim().slice(0, 100),
    message: form.elements.message.value.trim().slice(0, 2000),
    page: location.href,
    site: 'sobrano',
  };

  button.disabled = true;

  try {
    if (CONFIG.formEndpoint) {
      // text/plain — чтобы Google принял запрос без предварительной CORS-проверки
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
      });
      if (!res.ok || !(await res.json()).ok) throw new Error(`HTTP ${res.status}`);
    } else {
      const body = [
        `Имя: ${data.name}`,
        `Контакт: ${data.contact}`,
        `Услуги: ${data.services.join(', ') || '—'}`,
        '',
        data.message,
      ].join('\n');
      location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Заявка с сайта Собрано')}&body=${encodeURIComponent(body)}`;
    }
    lastSent = Date.now();
    status.className = 'form__status';
    status.textContent = '';
    showToast();
    form.reset();
  } catch (err) {
    status.className = 'form__status';
    status.textContent = `Не получилось отправить. Напишите нам в Telegram: @${CONFIG.telegram}`;
  } finally {
    syncSubmit();
  }
});

form.addEventListener('input', (e) => {
  const field = e.target.closest('.field, .consent');
  if (field) field.classList.remove('is-invalid');
});

/* ---------- Работы: видео и бот ---------- */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Видео подгружаются, когда до блока остаётся немного, играют только на экране и крутятся по кругу
const videos = document.querySelectorAll('.work-video');
if ('IntersectionObserver' in window && !reduceMotion) {
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.25 });
  videos.forEach((v) => vio.observe(v));
}

// Переписка с ботом: сообщения появляются по очереди, потом всё начинается заново
const bot = document.querySelector('.bot-loop');
if (bot && 'IntersectionObserver' in window && !reduceMotion) {
  const items = [...bot.children];
  const typing = bot.querySelector('.ws-chat__typing');
  const plan = [600, 900, 1100, 600, 0, 3400]; // пауза перед каждым шагом, мс
  let timer = null;
  let step = 0;

  const tick = () => {
    if (step === items.length) {
      items.forEach((el) => el.classList.remove('is-shown'));
      step = 0;
      timer = setTimeout(tick, 600);
      return;
    }
    const el = items[step];
    if (el === typing) {
      typing.classList.add('is-shown');
      step += 1;
      timer = setTimeout(() => { typing.classList.remove('is-shown'); tick(); }, 1100);
      return;
    }
    el.classList.add('is-shown');
    step += 1;
    timer = setTimeout(tick, plan[step] ?? 900);
  };

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !timer) {
      bot.classList.add('is-running');
      timer = setTimeout(tick, plan[0]);
    } else if (!entry.isIntersecting && timer) {
      clearTimeout(timer);
      timer = null;
    }
  }, { threshold: 0.3 }).observe(bot);
}

/* ---------- Работы: папки ---------- */
(() => {
  const tabs = [...document.querySelectorAll('.folder[role="tab"]')];
  if (!tabs.length) return;
  const open = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      open(t);
      history.replaceState(null, '', '#works-' + t.dataset.folder);
    });
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      open(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  // Прямая ссылка на папку: #works-sites, #works-services, #works-bots
  const m = location.hash.match(/^#works-(\w+)/);
  const fromHash = m && tabs.find((t) => t.dataset.folder === m[1]);
  if (fromHash) {
    open(fromHash);
    document.getElementById('works')?.scrollIntoView();
  }
})();

/* ---------- Работы: переписки в карточках ботов появляются по очереди ---------- */
document.querySelectorAll('.chat-loop').forEach((chat) => {
  if (!('IntersectionObserver' in window) || reduceMotion) return;
  const items = [...chat.children];
  let timer = null;
  let step = 0;
  const tick = () => {
    if (step === items.length) {
      timer = setTimeout(() => {
        items.forEach((el) => el.classList.remove('is-shown'));
        step = 0;
        timer = setTimeout(tick, 700);
      }, 3200);
      return;
    }
    const el = items[step++];
    el.classList.add('is-shown');
    if (el.classList.contains('typing')) {
      timer = setTimeout(() => { el.classList.remove('is-shown'); tick(); }, 1200);
    } else {
      timer = setTimeout(tick, 1100);
    }
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) {
      chat.classList.add('is-running');
      timer = setTimeout(tick, 400);
    } else if (!e.isIntersecting && timer) {
      clearTimeout(timer);
      timer = null;
    }
  }, { threshold: 0.3 }).observe(chat);
});

/* ---------- Работы: окно просмотра видео ---------- */
(() => {
  const dlg = document.getElementById('viewer');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const stage = dlg.querySelector('.viewer__stage');
  const title = dlg.querySelector('#viewer-title');
  const modes = dlg.querySelector('.viewer__modes');
  let current = null;

  const render = (mode) => {
    const d = current.dataset;
    stage.innerHTML = '';
    modes.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    if (d.viewer === 'video') {
      const v = document.createElement('video');
      v.src = mode === 'mobile' && d.mobile ? d.mobile : d.desktop;
      v.muted = true; v.loop = true; v.playsInline = true; v.controls = true; v.autoplay = true;
      if (mode === 'mobile') v.className = 'is-mobile';
      stage.append(v);
      v.play().catch(() => {});
    } else {
      const box = document.createElement('div');
      box.className = 'viewer__scroll';
      const img = document.createElement('img');
      img.src = d.full; img.alt = d.title;
      box.append(img);
      stage.append(box);
    }
  };

  document.querySelectorAll('[data-viewer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      current = btn;
      title.textContent = btn.dataset.title;
      modes.hidden = !(btn.dataset.viewer === 'video' && btn.dataset.mobile);
      render('desktop');
      dlg.showModal();
    });
  });
  modes.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (b && current) render(b.dataset.mode);
  });
  dlg.querySelector('.viewer__close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { stage.innerHTML = ''; current?.focus(); });
})();
