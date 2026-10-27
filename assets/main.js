/* ==========================================================
   Собрано — скрипты сайта
   ========================================================== */

// Контакты и отправка заявок — поменяйте на свои
const CONFIG = {
  telegram: 'sobranoru',          // юзернейм без @
  email: 'senyasule@yandex.ru',
  // Адрес, принимающий POST с JSON заявки (свой бэкенд, Formspree, вебхук бота и т.п.).
  // Пока пусто — форма откроет письмо с заполненной заявкой.
  // Внешний адрес нужно добавить в connect-src политики безопасности (<meta http-equiv="Content-Security-Policy">).
  formEndpoint: '',
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

/* ---------- Форма заявки ---------- */
const form = document.getElementById('lead-form');
const status = form.querySelector('.form__status');

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
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    if (CONFIG.formEndpoint) {
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    status.className = 'form__status is-ok';
    status.innerHTML = '<span class="tick"><svg width="8" height="8"><use href="#check"/></svg></span>Заявка собрана — ответим в течение рабочего дня.';
    form.reset();
  } catch (err) {
    status.className = 'form__status';
    status.textContent = `Не получилось отправить. Напишите нам в Telegram: @${CONFIG.telegram}`;
  } finally {
    button.disabled = false;
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
