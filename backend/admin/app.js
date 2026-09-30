"use strict";

const $ = (id) => document.getElementById(id);
const groups = {
  Images: "Фотографии и логотип",
  Hero: "Главный экран",
  BrickTitle: "Главный заголовок",
  About: "О компании",
  History: "История",
  Expertise: "Направления",
  Mission: "Миссия",
  Approach: "Наш подход",
  Values: "Ценности",
  Contacts: "Форма связи",
  Company: "Реквизиты и карточки",
  Header: "Шапка сайта",
  Footer: "Подвал",
  App: "Навигация",
  SEO: "Название сайта",
};
const statuses = { new: "Новая", progress: "В работе", done: "Завершена" };
let csrf = "";
let content = {};
let savedContent = {};
let textHistory = {};
let defaultTexts = {};
let version = 0;
let leads = [];
let dirty = false;
let group = "Images";
let saving = false;
let pendingUploads = 0;
let leadsRequest = 0;

function notice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
}
function setDirty(value) {
  dirty = value;
  $("save").disabled = !value || saving || pendingUploads > 0;
}
async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      $("workspace").hidden = true;
      $("login").hidden = false;
      $("logout").hidden = true;
    }
    throw new Error(result.error || "Ошибка сервера");
  }
  return result;
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
// Пользовательский контент выводим только через textContent: HTML не исполняется.
async function loadHistory() {
  try {
    const result = await api("/admin/history");
    textHistory = result.history || {};
    defaultTexts = result.defaults || {};
  } catch (error) {
    notice(`История недоступна: ${error.message}`, true);
  }
}

// Возврат меняет черновик только одного поля; публикация — кнопкой сохранения.
function historyControls(key, input) {
  const wrapper = element("div", undefined, "text-history");
  const undo = element("button", "Отменить правку поля");
  undo.type = "button";
  undo.onclick = () => {
    input.value = savedContent[key].value;
    input.dispatchEvent(new Event("input"));
    notice("В поле возвращён последний сохранённый текст.");
  };
  wrapper.append(undo);
  const details = element("details");
  details.append(element("summary", "Прежние варианты текста"));
  const select = element("select");
  select.setAttribute("aria-label", `Версия текста: ${content[key].label}`);
  const choices = (textHistory[key] || []).toReversed().map((entry) => ({
    value: entry.value,
    label: `Версия ${entry.version} — до изменения ${new Date(entry.replacedAt).toLocaleString("ru-RU")}`,
  }));
  if (Object.hasOwn(defaultTexts, key))
    choices.push({ value: defaultTexts[key], label: "Исходный текст сайта" });
  if (!choices.length) {
    details.append(element("p", "Сохранённых вариантов пока нет."));
    wrapper.append(details);
    return wrapper;
  }
  choices.forEach((choice, index) => {
    const option = element("option", choice.label);
    option.value = String(index);
    select.append(option);
  });
  const preview = element("p", choices[0].value, "history-preview");
  select.onchange = () => {
    preview.textContent = choices[Number(select.value)].value;
  };
  const restore = element("button", "Вернуть этот текст");
  restore.type = "button";
  restore.onclick = () => {
    input.value = choices[Number(select.value)].value;
    input.dispatchEvent(new Event("input"));
    notice(
      "Прежний текст возвращён в поле. Нажмите «Сохранить изменения», чтобы обновить сайт.",
    );
  };
  details.append(select, preview, restore);
  wrapper.append(details);
  return wrapper;
}

function renderFields() {
  $("fields").replaceChildren(element("h2", groups[group] || group));
  $("groups").replaceChildren();
  for (const [key, title] of Object.entries(groups)) {
    if (!Object.values(content).some((field) => field.group === key)) continue;
    const button = element("button", title, key === group ? "active" : "");
    button.onclick = () => {
      group = key;
      renderFields();
    };
    $("groups").append(button);
  }
  for (const [key, field] of Object.entries(content).sort(([a], [b]) =>
    a.localeCompare(b, "en", { numeric: true }),
  )) {
    if (field.group !== group) continue;
    const label = element("label", field.label);
    if (field.type === "image") {
      const preview = element("img", undefined, "preview");
      preview.alt = field.label;
      // Исходные фотографии включены в админку при сборке, загрузки обслуживает Go.
      preview.src = field.value.startsWith("/media/")
        ? field.value
        : `/${field.value}`;
      preview.onerror = () => {
        preview.hidden = true;
      };
      const input = element("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg";
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          notice("Размер файла должен быть не больше 8 МБ", true);
          return;
        }
        input.disabled = true;
        pendingUploads++;
        setDirty(dirty);
        try {
          const body = new FormData();
          body.append("file", file);
          const result = await api("/admin/media", { method: "POST", body });
          content[key].value = result.url;
          preview.src = result.url;
          preview.hidden = false;
          setDirty(true);
          notice(
            "Фотография загружена. Нажмите «Сохранить изменения», чтобы опубликовать её.",
          );
        } catch (error) {
          notice(error.message, true);
        } finally {
          input.disabled = false;
          pendingUploads--;
          setDirty(dirty);
        }
      };
      label.append(
        preview,
        input,
        element("small", "PNG или JPEG · до 8 МБ · до 40 мегапикселей"),
      );
    } else {
      const input = element("textarea");
      input.value = field.value;
      input.maxLength = 10000;
      input.rows = field.value.length > 140 ? 4 : 2;
      input.oninput = () => {
        content[key].value = input.value;
        setDirty(
          Object.keys(content).some(
            (fieldKey) =>
              content[fieldKey].value !== savedContent[fieldKey]?.value,
          ),
        );
      };
      label.append(input);
    }
    $("fields").append(label);
    if (field.type === "text")
      $("fields").append(historyControls(key, label.querySelector("textarea")));
  }
}
function renderLeads() {
  const search = $("search").value.toLocaleLowerCase("ru");
  const status = $("status-filter").value;
  $("count").textContent =
    `(${leads.filter((lead) => lead.status === "new").length})`;
  $("leads").replaceChildren();
  const filtered = leads.filter(
    (lead) =>
      (!status || lead.status === status) &&
      `${lead.name} ${lead.phone} ${lead.message}`
        .toLocaleLowerCase("ru")
        .includes(search),
  );
  for (const lead of filtered.toReversed()) {
    const card = element("article", undefined, "lead");
    const phone = element("a", lead.phone);
    phone.href = `tel:${lead.phone.replace(/[^+\d]/g, "")}`;
    const select = element("select");
    select.setAttribute("aria-label", `Статус заявки: ${lead.name}`);
    for (const [value, title] of Object.entries(statuses)) {
      const option = element("option", title);
      option.value = value;
      select.append(option);
    }
    select.value = lead.status;
    select.onchange = async () => {
      select.disabled = true;
      leadsRequest++;
      try {
        await api(`/admin/leads/${lead.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        leads = leads.map((entry) =>
          entry.id === lead.id ? { ...entry, status: select.value } : entry,
        );
        renderLeads();
        notice("Статус сохранён");
      } catch (error) {
        select.value = lead.status;
        notice(error.message, true);
      } finally {
        select.disabled = false;
      }
    };
    card.append(
      element("small", new Date(lead.createdAt).toLocaleString("ru-RU")),
      element("h2", lead.name),
      phone,
      element("p", lead.message || "Без описания проекта"),
      select,
    );
    $("leads").append(card);
  }
  if (!filtered.length)
    $("leads").append(
      element(
        "p",
        leads.length
          ? "По вашему запросу ничего не найдено."
          : "Заявок пока нет. Здесь появятся обращения с сайта.",
      ),
    );
}
async function refreshLeads() {
  const requestID = ++leadsRequest;
  const result = await api("/admin/leads");
  if (requestID !== leadsRequest) return;
  leads = result;
  renderLeads();
}
async function enter(session) {
  csrf = session.csrf;
  $("login").hidden = true;
  $("logout").hidden = false;
  $("workspace").hidden = false;
  const data = await api("/content");
  if (!dirty) {
    content = data.content;
    savedContent = structuredClone(content);
    version = data.version;
    await loadHistory();
    renderFields();
  }
  await refreshLeads();
}
$("login").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await enter(
      await api("/admin/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    );
    $("login").reset();
    notice("");
  } catch (error) {
    notice(error.message, true);
  } finally {
    button.disabled = false;
  }
};
$("logout").onclick = async () => {
  if (
    (dirty || pendingUploads > 0) &&
    !confirm("Есть несохранённые изменения. Выйти без сохранения?")
  )
    return;
  try {
    await api("/admin/logout", { method: "POST" });
    setDirty(false);
    location.reload();
  } catch (error) {
    notice(error.message, true);
  }
};
$("save").onclick = async () => {
  if (saving || pendingUploads > 0) return;
  saving = true;
  $("save").disabled = true;
  // Блокируем редактор на время записи, чтобы новые правки не потерялись.
  $("fields").inert = true;
  $("groups").inert = true;
  try {
    const result = await api("/admin/content", {
      method: "PUT",
      body: JSON.stringify({ version, content }),
    });
    version = result.version;
    savedContent = structuredClone(content);
    setDirty(false);
    await loadHistory();
    renderFields();
    notice(
      "Изменения сохранены. Обновите страницу сайта, чтобы увидеть результат.",
    );
  } catch (error) {
    notice(error.message, true);
  } finally {
    saving = false;
    $("fields").inert = false;
    $("groups").inert = false;
    setDirty(dirty);
  }
};
function tab(leadsVisible) {
  $("content-panel").hidden = leadsVisible;
  $("leads-panel").hidden = !leadsVisible;
  $("content-tab").classList.toggle("active", !leadsVisible);
  $("leads-tab").classList.toggle("active", leadsVisible);
  if (leadsVisible)
    refreshLeads().catch((error) => notice(error.message, true));
}
$("content-tab").onclick = () => tab(false);
$("leads-tab").onclick = () => tab(true);
$("refresh").onclick = () =>
  refreshLeads().catch((error) => notice(error.message, true));
$("search").oninput = renderLeads;
$("status-filter").onchange = renderLeads;
window.addEventListener("beforeunload", (event) => {
  if (dirty || pendingUploads > 0) {
    event.preventDefault();
    event.returnValue = "";
  }
});
api("/admin/session")
  .then(enter)
  .catch((error) => {
    $("login").hidden = false;
    if (!error.message.includes("Войдите")) notice(error.message, true);
  });
