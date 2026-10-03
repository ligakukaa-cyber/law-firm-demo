/* ОПОРА — квиз оценки дела, проверка исковой давности, заявка. */
(() => {
  /* ---------- шапка и появление ---------- */
  const nav = document.getElementById("nav");
  const fab = document.querySelector(".call-fab");
  const formSec = document.getElementById("form");
  const onScroll = () => {
    nav.classList.toggle("stuck", window.scrollY > 40);
    if (fab && formSec) {
      const r = formSec.getBoundingClientRect();
      fab.classList.toggle("hide", window.scrollY < 300 || r.top < window.innerHeight);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const io = new IntersectionObserver((items) => {
    items.forEach((it) => { if (it.isIntersecting) { it.target.classList.add("in"); io.unobserve(it.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- квиз ---------- */
  // цена этапа в рублях [от, до] — для обычного спора на 100 тыс.–1 млн
  const STAGES = {
    start:   { title: "Консультация и план действий", price: [0, 0], time: "в день обращения",
               first: "Бесплатная консультация 30 минут" },
    claim:   { title: "Досудебная претензия и переговоры", price: [5000, 15000], time: "3–10 дней",
               first: "Разбор документов и проект претензии" },
    court:   { title: "Ведение дела в суде под ключ", price: [35000, 90000], time: "2–6 месяцев",
               first: "Оценка доказательств и подготовка иска" },
    appeal:  { title: "Обжалование решения суда", price: [30000, 70000], time: "1–3 месяца",
               first: "Анализ решения и апелляционная жалоба" },
    enforce: { title: "Исполнение решения суда", price: [15000, 40000], time: "1–4 месяца",
               first: "Исполнительный лист и работа с приставами" },
  };
  // сложность направления; не ниже 1 — квиз не должен обещать дешевле прайса
  const AREA = { family: 1.1, realty: 1.2, auto: 1, consumer: 1, labor: 1, business: 1.5 };
  // поправка на сумму спора
  const SUM = { small: 1, mid: 1.1, big: 1.4, none: 1 };
  const AREA_NAME = {
    family: "семейный спор", realty: "вопрос по недвижимости", auto: "ДТП / страховая",
    consumer: "защита прав потребителя", labor: "трудовой спор", business: "долги / бизнес",
  };

  const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
  const round = (n) => Math.round(n / 1000) * 1000;

  const box = document.getElementById("quizBox");
  if (box) {
    const steps = [...box.querySelectorAll(".q-step")];
    const back = document.getElementById("qBack");
    const next = document.getElementById("qNext");
    const bar = document.getElementById("qBar");
    const count = document.getElementById("qCount");
    const result = document.getElementById("qResult");
    const navRow = document.getElementById("qNav");
    let i = 0;

    const picked = (step) => step.querySelector("input:checked");
    const show = () => {
      steps.forEach((s, n) => s.classList.toggle("active", n === i));
      bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      count.textContent = `Вопрос ${i + 1} из ${steps.length}`;
      back.disabled = i === 0;
      next.disabled = !picked(steps[i]);
      next.textContent = i === steps.length - 1 ? "Показать оценку" : "Далее";
    };

    const finish = () => {
      const v = (name) => box.querySelector(`input[name="${name}"]:checked`).value;
      const area = v("area"), stage = STAGES[v("stage")], sum = v("sum"), urgent = v("urgent");
      const k = AREA[area] * SUM[sum];
      const [lo, hi] = stage.price.map((p) => round(p * k));

      document.getElementById("rTitle").textContent = stage.title;
      document.getElementById("rPrice").textContent =
        hi === 0 ? "Бесплатно" : `${rub(lo)} – ${rub(hi)}`;
      document.getElementById("rTime").textContent = stage.time;
      document.getElementById("rFirst").textContent = stage.first;
      document.getElementById("rNote").textContent = urgent === "today"
        ? "Раз есть крайний срок — позвоните или оставьте заявку: срочные дела берем в работу в тот же день."
        : "Оценка предварительная. Точную сумму юрист назовет после консультации и закрепит в договоре.";

      steps.forEach((s) => s.classList.remove("active"));
      navRow.hidden = true;
      count.textContent = "Готово";
      bar.style.width = "100%";
      result.hidden = false;

      // подставляем ответы в заявку, чтобы юристу не переспрашивать
      const note = document.getElementById("note");
      if (note && !note.value) {
        const sumText = box.querySelector('input[name="sum"]:checked').nextElementSibling.textContent;
        note.value = `${AREA_NAME[area]}; ${stage.title.toLowerCase()}; сумма: ${sumText.toLowerCase()}.`;
      }
    };

    box.addEventListener("change", () => { next.disabled = !picked(steps[i]); });
    next.addEventListener("click", () => {
      if (!picked(steps[i])) return;
      if (i < steps.length - 1) { i += 1; show(); } else { finish(); }
    });
    back.addEventListener("click", () => { if (i > 0) { i -= 1; show(); } });
    show();
  }

  /* ---------- исковая давность: 3 года (ст. 196 ГК РФ) ---------- */
  const termDate = document.getElementById("termDate");
  const termOut = document.getElementById("termOut");
  if (termDate && termOut) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    termDate.max = today.toISOString().slice(0, 10);

    termDate.addEventListener("change", () => {
      if (!termDate.value) return;
      const start = new Date(termDate.value + "T00:00:00");
      if (start > today) {
        termOut.classList.remove("late");
        termOut.textContent = "Дата не может быть в будущем.";
        return;
      }
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 3);
      const days = Math.round((end - today) / 86400000);
      const endText = end.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
      termOut.classList.toggle("late", days < 0);
      termOut.innerHTML = days >= 0
        ? `Срок истекает <b>${endText}</b> — осталось <b>${days} дн.</b> Лучше не тянуть: на подготовку иска нужно время.`
        : `Общий срок истек <b>${endText}</b>. Иногда его можно восстановить по уважительной причине (ст. 205 ГК РФ) — обсудим на консультации.`;
    });
  }

  /* ---------- заявка ---------- */
  const form = document.getElementById("leadForm");
  if (form) {
    const ok = document.getElementById("ok");
    const bad = (input, text) => {
      const field = input.closest(".field, .check");
      field.classList.add("bad");
      if (text && !field.querySelector(".err")) {
        const p = document.createElement("p");
        p.className = "err";
        p.textContent = text;
        field.appendChild(p);
      }
    };
    const clean = (input) => {
      const field = input.closest(".field, .check");
      field.classList.remove("bad");
      field.querySelector(".err")?.remove();
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name");
      const phone = document.getElementById("phone");
      const agree = document.getElementById("agree");
      [name, phone, agree].forEach(clean);

      let valid = true;
      if (name.value.trim().length < 2) { bad(name, "Напишите, как к вам обращаться"); valid = false; }
      if (phone.value.replace(/\D/g, "").length < 10) { bad(phone, "Проверьте номер телефона"); valid = false; }
      if (!agree.checked) { bad(agree); valid = false; }
      if (!valid) return;

      ok.hidden = false;
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      setTimeout(() => { form.reset(); ok.hidden = true; btn.disabled = false; }, 6000);
    });

    document.getElementById("phone")?.addEventListener("input", (e) => {
      const d = e.target.value.replace(/\D/g, "").slice(0, 11);
      if (!d) { e.target.value = ""; return; }
      const body = d.length === 11 ? d.slice(1) : d;
      const parts = [body.slice(0, 3), body.slice(3, 6), body.slice(6, 8), body.slice(8, 10)];
      e.target.value = "+7 " + parts[0] + (parts[1] ? " " + parts[1] : "") +
        (parts[2] ? "-" + parts[2] : "") + (parts[3] ? "-" + parts[3] : "");
    });
  }
})();
