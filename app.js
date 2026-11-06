(() => {
  "use strict";

  const all = (selector) => [...document.querySelectorAll(selector)];
  const one = (selector) => document.querySelector(selector);
  const languages = window.siteLanguages;
  const profile = window.patrickProfile;
  // The script lives at the site root, which can be a repository subdirectory.
  const siteRoot = new URL(".", document.currentScript.src);
  const scriptDirectory = siteRoot.pathname.split("/").filter(Boolean).at(-1);
  if (Object.hasOwn(languages, scriptDirectory)) {
    // The local preview server also serves the bundle below /<locale>/.
    siteRoot.pathname = new URL("../", siteRoot).pathname;
  }
  const pane = one(".profile-panel-content");
  const links = all(".profile-menu-link");
  const targets = links.map(link => document.querySelector(link.hash));
  const title = one(".profile-hero-title");
  const greeting = one(".profile-hero-title-blur");
  const picker = one(".profile-language-picker");
  const trigger = one("#profile-language-trigger");
  const dialog = one("#profile-language-dialog");
  const search = one("#profile-language-search");
  const clearSearch = one(".core-ui-preference-search-clear");
  const list = one("#profile-language-listbox");
  const notice = one("#site-notice");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let locale;

  function localeFromURL() {
    const url = new URL(location.href);
    const segment = url.pathname.split("/").filter(Boolean).pop();
    const requested = url.searchParams.get("lang") || segment;
    return Object.hasOwn(languages, requested) ? requested : "en-US";
  }

  function languageURL(code) {
    const url = new URL(location.href);
    if (url.protocol === "file:") {
      url.searchParams.set("lang", code);
    } else {
      url.pathname = new URL(code + "/", siteRoot).pathname;
      url.searchParams.delete("lang");
    }
    return url.href;
  }

  function fitTitle() {
    title.style.removeProperty("--profile-hero-title-fitted-font-size");
    const available = title.clientWidth;
    if (!available) return;
    const baseSize = parseFloat(getComputedStyle(title).fontSize);
    const widest = Math.max(greeting.scrollWidth, one(".profile-hero-tagline").scrollWidth, available);
    // Keep the English heading on the reference site's two-line scale after the name change.
    const englishSize = locale === "en-US" ? available * 0.0703 : baseSize;
    const size = Math.min(englishSize, baseSize * available / widest);
    title.style.setProperty("--profile-hero-title-fitted-font-size", Math.max(16, size) + "px");
  }

  function translate(code) {
    locale = code;
    const copy = languages[code];
    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    document.title = copy.greeting;
    greeting.textContent = copy.greeting;
    one(".profile-hero-tagline").textContent = copy.tagline;
    const lines = all(".profile-bio-scramble");
    lines.forEach((line, i) => { line.textContent = copy.bio[i]; });
    const accountLink = document.createElement("a");
    accountLink.href = profile.social.github;
    accountLink.target = "_blank";
    accountLink.rel = "noopener noreferrer";
    accountLink.textContent = copy.bio[3];
    lines[3].replaceChildren(accountLink);
    links.forEach((link, i) => { link.querySelector("span").textContent = copy.nav[i]; });
    all(".profile-section-heading").forEach((heading, i) => {
      heading.textContent = copy.sections[i];
      heading.parentElement.setAttribute("aria-label", copy.sections[i]);
    });
    all(".profile-project-card").forEach((card, i) => {
      const [name, description] = copy.projects[i];
      card.querySelector(".profile-project-title").textContent = name;
      card.querySelector(".profile-project-description").textContent = description;
      card.setAttribute("aria-label", name + " — " + description);
    });
    all(".profile-blog-card").forEach((card, i) => {
      const [name, description] = copy.posts[i];
      card.querySelector(".profile-blog-title").textContent = name;
      card.querySelector(".profile-blog-description").textContent = description;
      card.setAttribute("aria-label", name);
    });
    one('.legal-footer-note').textContent = copy.rights;
    one('[data-notice="privacy"]').textContent = copy.privacy;
    one('[data-notice="terms"]').textContent = copy.terms;
    trigger.dataset.locale = code;
    trigger.setAttribute("aria-label", copy.search + " · " + copy.label);
    search.placeholder = copy.search;
    search.setAttribute("aria-label", copy.search);
    requestAnimationFrame(fitTitle);
  }

  function renderOptions() {
    const filter = search.value.trim().toLocaleLowerCase();
    clearSearch.hidden = !filter;
    const options = document.createDocumentFragment();
    for (const [code, copy] of Object.entries(languages)) {
      const description = copy.label + " " + code;
      if (!description.toLocaleLowerCase().includes(filter)) continue;
      const option = document.createElement("a");
      option.href = languageURL(code);
      option.dataset.locale = code;
      option.className = "core-ui-anchored-dialog-item";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(locale === code));
      option.classList.toggle("is-selected", locale === code);
      option.lang = code;
      option.dir = code === "ar" ? "rtl" : "ltr";
      option.textContent = copy.label;
      options.append(option);
    }
    if (!options.childNodes.length) {
      const message = document.createElement("span");
      message.className = "core-ui-preference-empty";
      message.setAttribute("role", "status");
      message.textContent = languages[locale].search + " · 0";
      options.append(message);
    }
    list.replaceChildren(options);
  }

  function setPicker(open, restoreFocus = false) {
    trigger.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    dialog.setAttribute("aria-hidden", String(!open));
    dialog.dataset.open = String(open);
    dialog.inert = !open;
    if (open) {
      search.value = "";
      renderOptions();
      search.focus({ preventScroll: true });
    } else if (restoreFocus) {
      trigger.focus({ preventScroll: true });
    }
  }

  trigger.addEventListener("click", () => setPicker(dialog.inert));
  search.addEventListener("input", renderOptions);
  clearSearch.addEventListener("click", () => { search.value = ""; renderOptions(); search.focus(); });
  list.addEventListener("click", (event) => {
    const option = event.target.closest("[data-locale]");
    if (!option || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (locale !== option.dataset.locale) {
      if (location.protocol === "file:") {
        location.assign(option.href);
        return;
      }
      history.pushState(null, "", option.href);
      translate(option.dataset.locale);
      jumpToHash("instant");
    }
    setPicker(false, true);
  });
  picker.addEventListener("keydown", (event) => {
    if (dialog.inert) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setPicker(false, true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    const choices = [...list.querySelectorAll("[role=option]")];
    if (!choices.length) return;
    const index = choices.indexOf(document.activeElement);
    if (event.key === "Enter" && document.activeElement === search) {
      event.preventDefault();
      choices[0].click();
    } else if (event.key !== "Enter") {
      event.preventDefault();
      const step = event.key === "ArrowUp" ? -1 : 1;
      const next = index === -1 ? (step === 1 ? 0 : choices.length - 1) : (index + step + choices.length) % choices.length;
      choices[next].focus();
    }
  });
  document.addEventListener("pointerdown", event => {
    if (!dialog.inert && !picker.contains(event.target)) setPicker(false);
  });
  picker.addEventListener("focusout", event => {
    if (!dialog.inert && event.relatedTarget && !picker.contains(event.relatedTarget)) setPicker(false);
  });

  function scrollTopFor(target) {
    if (target === pane) return 0;
    const padding = parseFloat(getComputedStyle(pane).scrollPaddingTop) || 32;
    return target.offsetTop - padding;
  }

  function jumpToHash(behavior) {
    const target = targets.find(section => "#" + section.id === location.hash) || pane;
    pane.scrollTo({ top: scrollTopFor(target), behavior });
  }

  function markSection() {
    const scrolled = pane.scrollTop > 3;
    pane.classList.toggle("profile-panel-content-scrolled", scrolled);
    let current = 0;
    if (scrolled) {
      targets.forEach((target, i) => { if (pane.scrollTop + 3 >= scrollTopFor(target)) current = i; });
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 3) current = links.length - 1;
    }
    links.forEach((link, i) => {
      link.classList.toggle("profile-menu-link-active", current === i);
      if (current === i) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  links.forEach(link => {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, "", link.hash);
      jumpToHash(reduceMotion.matches ? "instant" : "smooth");
    });
  });
  const navArrow = links[1].querySelector("svg");
  links[0].append(navArrow.cloneNode(true));
  one(".profile-social-block").id = "social-links";
  pane.addEventListener("scroll", markSection, { passive: true });
  window.addEventListener("popstate", () => {
    setPicker(false);
    translate(localeFromURL());
    jumpToHash("instant");
    markSection();
  });

  const notices = {
    en: {
      privacy: "GitHub Pages hosts this site. The portfolio does not set tracking cookies or collect contact details. Links to projects and notes open GitHub.",
      terms: "The project and blog cards link to their original publishers. Their names, logos and articles belong to their respective owners."
    },
    zh: {
      privacy: "本站由 GitHub Pages 托管。页面不设置追踪 Cookie，也不收集联系资料。项目和笔记链接会打开 GitHub。",
      terms: "项目和文章卡片链接到原发布方。相关名称、标志和文章归各自权利人所有。"
    }
  };
  all("[data-notice]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    one("#notice-title").textContent = link.textContent;
    const copy = locale.startsWith("zh") ? "zh" : "en";
    one("#notice-body").lang = copy;
    one("#notice-body").textContent = notices[copy][link.dataset.notice];
    notice.showModal();
  }));
  notice.addEventListener("click", event => { if (event.target === notice) notice.close(); });

  one(".profile-hero-avatar").src = new URL(profile.avatar, siteRoot).href;
  all("[data-network]").forEach(link => {
    const address = profile.social[link.dataset.network];
    if (address) link.href = address;
    link.title = link.getAttribute("aria-label");
  });
  const initialLocale = localeFromURL();
  const initialURL = new URL(location.href);
  if (initialURL.protocol !== "file:" && Object.hasOwn(languages, initialURL.searchParams.get("lang"))) {
    // A static host's 404 page forwarded the locale to the shared index.
    history.replaceState(null, "", languageURL(initialLocale));
  }
  translate(initialLocale);
  new ResizeObserver(fitTitle).observe(pane);
  requestAnimationFrame(() => { jumpToHash("instant"); markSection(); });
})();
