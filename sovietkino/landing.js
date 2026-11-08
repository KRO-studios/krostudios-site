(() => {
  "use strict";

  const cleanAnswer = (value) => String(value)
    .toLocaleUpperCase("ru")
    .replace(/[^А-ЯЁ]/g, "")
    .slice(0, 12);

  // Keep Ё visible in the player's word, but accept Е and Ё interchangeably.
  const answerKey = (value) => cleanAnswer(value).replace(/Ё/g, "Е");
  const searchKey = (value) => String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const films = Object.freeze({
    diamond: {
      title: "Бриллиантовая рука",
      art: "hero-diamond-arm",
      questionIds: ["g-a-01"],
    },
    irony: {
      title: "Ирония судьбы, или С лёгким паром!",
      art: "hero-irony-of-fate",
      questionIds: ["r-f-01"],
    },
    office: {
      title: "Служебный роман",
      art: "hero-office-romance",
      questionIds: [],
    },
    moscow: {
      title: "Москва слезам не верит",
      art: "hero-moscow",
      questionIds: ["m-c-01"],
    },
    "kin-dza-dza": {
      title: "Кин-дза-дза!",
      art: "hero-kin-dza-dza",
      questionIds: ["d-p-01"],
    },
    gentlemen: {
      title: "Джентльмены удачи",
      art: "hero-gentlemen-of-fortune",
      questionIds: ["c-p-04", "c-c-05"],
    },
  });
  const previews = Object.freeze({
    ...films,
    collection: { title: "Любимые фильмы. Знакомые истории.", questionIds: [] },
  });
  const questionFilms = Object.freeze({
    "g-c-01": "shurik",
    "g-a-01": "diamond",
    "r-f-01": "irony",
    "d-p-01": "kin-dza-dza",
    "c-c-05": "gentlemen",
    "c-p-04": "gentlemen",
    "m-c-01": "moscow",
  });
  const safeFilms = new Set(["all", "shurik", ...Object.keys(films)]);
  const safePlacements = new Set(["page", "hero", "question", "film_card", "result", "sticky", "footer", "download"]);
  const eventNames = new Set(["page_view", "demo_start", "question_answered", "demo_complete", "store_click"]);

  // This is an in-page integration hook, not an analytics service. It does not
  // persist answers, load a tracker or send requests. A separately configured
  // and consent-aware collector can subscribe later. Raw guesses/URLs never
  // enter an event, including campaign/query-string values.
  const emit = (name, fields = {}) => {
    if (!eventNames.has(name)) return;
    const detail = {
      app: "sovietkino",
      event: name,
      film: safeFilms.has(fields.film) ? fields.film : "all",
      placement: safePlacements.has(fields.placement) ? fields.placement : "page",
    };
    for (const key of ["answered", "unassisted", "assisted", "revealed", "hinted", "total"]) {
      if (Number.isInteger(fields[key]) && fields[key] >= 0 && fields[key] <= 3) detail[key] = fields[key];
    }
    if (["correct", "assisted", "revealed"].includes(fields.outcome)) detail.outcome = fields.outcome;
    if (["app_store", "google_play"].includes(fields.store)) detail.store = fields.store;
    document.dispatchEvent(new CustomEvent("funnel_event", { detail: Object.freeze(detail) }));
  };

  const reducedMotion = () => !window.matchMedia
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusWithoutScroll = (element) => {
    if (!element) return;
    try { element.focus({ preventScroll: true }); } catch (_) { element.focus(); }
  };
  const showSection = (element, focus) => {
    if (!element) return;
    element.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    focusWithoutScroll(focus);
  };
  const letterNoun = (count) => {
    if (count % 100 >= 11 && count % 100 <= 14) return "букв";
    if (count % 10 === 1) return "буква";
    if (count % 10 >= 2 && count % 10 <= 4) return "буквы";
    return "букв";
  };

  // Only local editorial assets are accepted from the embedded sample data.
  const localArtwork = (value) => typeof value === "string"
    && /^assets\/web\/[a-z0-9_-]+\.(?:avif|webp|png|jpe?g)$/i.test(value);
  const validQuestion = (question) => {
    if (!question || typeof question !== "object" || !Object.hasOwn(questionFilms, question.id)) return false;
    const required = ["id", "clue", "answer", "film", "funFact", "category"];
    if (!required.every((key) => typeof question[key] === "string" && question[key].trim() && question[key].length <= 700)) return false;
    if (!/^[А-ЯЁа-яё]{1,12}$/.test(question.answer)) return false;
    if (!Number.isInteger(Number(question.year)) || Number(question.year) < 1895 || Number(question.year) > 2100) return false;
    if (!Array.isArray(question.acceptedAnswers)
      || !question.acceptedAnswers.every((answer) => typeof answer === "string" && /^[А-ЯЁа-яё]{1,12}$/.test(answer))) return false;
    for (const key of ["campaignClue", "hint"]) {
      if (question[key] !== undefined && (typeof question[key] !== "string" || !question[key].trim() || question[key].length > 400)) return false;
    }
    return localArtwork(question.art) && (!question.art2x || localArtwork(question.art2x));
  };

  const wordFeedback = (guess, answer) => {
    const states = Array(guess.length).fill("absent");
    const remaining = new Map();
    // Exact matches consume their occurrence before repeated misplaced guesses.
    for (let index = 0; index < answer.length; index += 1) {
      if (guess[index] === answer[index]) states[index] = "correct";
      else remaining.set(answer[index], (remaining.get(answer[index]) || 0) + 1);
    }
    for (let index = 0; index < guess.length; index += 1) {
      if (states[index] === "correct") continue;
      const available = remaining.get(guess[index]) || 0;
      if (available > 0) {
        states[index] = "present";
        remaining.set(guess[index], available - 1);
      }
    }
    return states;
  };

  const initialSelection = () => {
    const params = new URLSearchParams(window.location.search);
    const film = params.get("film");
    return {
      film: Object.hasOwn(films, film) ? film : null,
      challenge: params.get("challenge") === "vasily-city" ? "vasily-city" : null,
    };
  };

  const setupQuiz = (selection) => {
    const ids = ["quiz-data", "quiz-art", "quiz-category", "quiz-progress", "quiz-clue",
      "quiz-length", "quiz-form", "quiz-answer", "quiz-submit", "quiz-letters",
      "quiz-status", "quiz-payoff", "quiz-film", "quiz-fact", "quiz-reveal", "quiz-next",
      "quiz-hint", "quiz-finish", "quiz-result", "quiz-score", "quiz-result-copy",
      "quiz-result-details", "quiz-restart", "quiz-question-panel"];
    const nodes = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    if (!ids.every((id) => nodes[id])) return null;
    const input = nodes["quiz-answer"];
    const submit = nodes["quiz-submit"];
    const reveal = nodes["quiz-reveal"];
    const next = nodes["quiz-next"];
    const hint = nodes["quiz-hint"];
    const finish = nodes["quiz-finish"];
    const result = nodes["quiz-result"];
    const status = nodes["quiz-status"];
    let questions;
    try {
      questions = JSON.parse(nodes["quiz-data"].textContent);
      if (!Array.isArray(questions) || !questions.length || !questions.every(validQuestion)
        || new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error("Invalid quiz data");
    } catch (_) {
      for (const control of [input, submit, reveal, next, hint, finish, nodes["quiz-restart"]]) control.disabled = true;
      status.textContent = "Пример временно недоступен. Другие вопросы ждут вас в приложении.";
      return null;
    }

    const byId = new Map(questions.map((question) => [question.id, question]));
    const chooseFilmQuestion = (slug) => films[slug]?.questionIds.find((id) => byId.has(id)) || null;
    let preferredId = selection.challenge && byId.has("c-p-04") ? "c-p-04" : chooseFilmQuestion(selection.film);
    let selectedFilm = selection.challenge && byId.has("c-p-04") ? "gentlemen" : selection.film;
    let campaignActive = Boolean(selection.challenge && byId.has("c-p-04"));
    let roundPreference = preferredId;
    let roundCampaign = campaignActive;
    let round = [];
    let outcomes = [];
    let currentIndex = 0;
    let roundFinished = false;
    let roundStarted = false;
    let hasFeedback = false;
    let composing = false;
    const currentQuestion = () => round[currentIndex];
    const currentOutcome = () => outcomes[currentIndex];
    const resolved = () => Boolean(currentOutcome()?.outcome);
    const setStatus = (message, state = "") => {
      status.textContent = message;
      status.dataset.state = state;
    };
    const startEvent = (placement = "question") => {
      if (roundStarted || roundFinished) return;
      roundStarted = true;
      emit("demo_start", { film: questionFilms[currentQuestion().id], placement });
    };
    const renderLetters = (word = "", states = []) => {
      const count = Math.max(currentQuestion().answer.length, word.length);
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < count; index += 1) {
        const letter = document.createElement("span");
        const state = states[index] || "empty";
        letter.className = `quiz-letter${state === "empty" ? "" : ` is-${state}`}`;
        letter.dataset.state = state;
        letter.textContent = word[index] || "";
        fragment.appendChild(letter);
      }
      nodes["quiz-letters"].replaceChildren(fragment);
    };
    const renderQuestion = () => {
      const question = currentQuestion();
      hasFeedback = false;
      composing = false;
      input.value = "";
      input.disabled = false;
      submit.disabled = false;
      reveal.disabled = false;
      hint.disabled = false;
      next.disabled = true;
      next.hidden = false;
      next.textContent = "Следующий вопрос →";
      finish.disabled = true;
      finish.hidden = true;
      nodes["quiz-category"].textContent = question.category;
      nodes["quiz-progress"].textContent = `Вопрос ${currentIndex + 1} из ${round.length}`;
      nodes["quiz-clue"].textContent = roundCampaign && question.id === "c-p-04" && question.campaignClue
        ? question.campaignClue : question.clue;
      nodes["quiz-length"].textContent = `Ответ — ${question.answer.length} ${letterNoun(question.answer.length)}.`;
      nodes["quiz-art"].setAttribute("src", question.art);
      nodes["quiz-art"].alt = `Иллюстрация из игры: «${question.film}»`;
      if (question.art2x) nodes["quiz-art"].setAttribute("srcset", `${question.art} 1x, ${question.art2x} 2x`);
      else nodes["quiz-art"].removeAttribute("srcset");
      nodes["quiz-payoff"].hidden = true;
      nodes["quiz-film"].textContent = "";
      nodes["quiz-fact"].textContent = "";
      nodes["quiz-question-panel"].hidden = false;
      result.hidden = true;
      setStatus("");
      renderLetters();
    };
    const makeRound = (firstId) => {
      const order = [firstId, "g-c-01", "r-f-01", "d-p-01", "g-a-01", "m-c-01", "c-c-05", "c-p-04"];
      const chosen = [];
      const usedFilms = new Set();
      for (const id of order) {
        const question = byId.get(id);
        if (!question || usedFilms.has(question.film)) continue;
        chosen.push(question);
        usedFilms.add(question.film);
        if (chosen.length === 3) break;
      }
      return chosen;
    };
    const beginRound = (firstId, useCampaign, { focus = false, placement = "hero", track = false } = {}) => {
      const nextRound = makeRound(firstId);
      if (nextRound.length !== 3) {
        status.textContent = "Раунд временно недоступен. Полная коллекция есть в приложении.";
        return false;
      }
      round = nextRound;
      roundPreference = firstId;
      roundCampaign = useCampaign;
      outcomes = round.map(() => ({ outcome: null, hinted: false }));
      currentIndex = 0;
      roundFinished = false;
      roundStarted = false;
      for (const key of ["answered", "unassisted", "assisted", "revealed", "hinted", "total"]) delete result.dataset[key];
      nodes["quiz-result-details"].replaceChildren();
      nodes["quiz-score"].textContent = "";
      nodes["quiz-result-copy"].textContent = "";
      nodes["quiz-restart"].disabled = false;
      renderQuestion();
      if (track) startEvent(placement);
      if (focus) showSection(document.getElementById("try"), nodes["quiz-clue"]);
      return true;
    };
    const settleQuestion = (outcome) => {
      if (roundFinished || resolved()) return;
      const question = currentQuestion();
      currentOutcome().outcome = outcome;
      input.disabled = true;
      submit.disabled = true;
      reveal.disabled = true;
      hint.disabled = true;
      nodes["quiz-film"].textContent = `${question.film} · ${question.year}`;
      nodes["quiz-fact"].textContent = question.funFact;
      nodes["quiz-payoff"].hidden = false;
      const last = currentIndex === round.length - 1;
      next.disabled = last;
      next.hidden = last;
      finish.hidden = !last;
      finish.disabled = !last;
      emit("question_answered", { film: questionFilms[question.id], placement: "question", outcome });
      // The completed control is disabled, so move to the available next step.
      // The polite status announces the answer without a forced countdown.
      focusWithoutScroll(last ? finish : next);
    };
    const normaliseInput = () => {
      if (roundFinished || resolved() || composing) return;
      const before = input.value;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const direction = input.selectionDirection;
      const cleaned = cleanAnswer(before);
      if (cleaned !== before) {
        input.value = cleaned;
        if (start !== null && end !== null) {
          input.setSelectionRange(
            Math.min(cleanAnswer(before.slice(0, start)).length, cleaned.length),
            Math.min(cleanAnswer(before.slice(0, end)).length, cleaned.length),
            direction || "none",
          );
        }
      }
      renderLetters(input.value, currentOutcome().hinted && answerKey(input.value[0]) === answerKey(currentQuestion().answer[0]) ? ["hint"] : []);
      if (input.value) startEvent();
      if (hasFeedback) { setStatus(""); hasFeedback = false; }
    };
    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => { composing = false; normaliseInput(); });
    input.addEventListener("input", normaliseInput);
    nodes["quiz-form"].addEventListener("submit", (event) => {
      event.preventDefault();
      if (roundFinished || resolved() || composing) return;
      startEvent();
      normaliseInput();
      const question = currentQuestion();
      const word = input.value;
      const key = answerKey(word);
      const accepted = new Set([question.answer, ...question.acceptedAnswers].map(answerKey));
      if (accepted.has(key)) {
        renderLetters(word, Array(word.length).fill("correct"));
        setStatus(currentOutcome().hinted
          ? `Верно: ${cleanAnswer(question.answer)}! Ответ с подсказкой — это будет отмечено в результате.`
          : `Верно: ${cleanAnswer(question.answer)}! Вы вспомнили сами.`, "correct");
        settleQuestion(currentOutcome().hinted ? "assisted" : "correct");
        return;
      }
      if (word.length !== question.answer.length) {
        setStatus(`Нужно ${question.answer.length} ${letterNoun(question.answer.length)}. Сейчас введено: ${word.length}.`, "length");
        hasFeedback = true;
        return;
      }
      const states = wordFeedback(key, answerKey(question.answer));
      renderLetters(word, states);
      const explanations = states.map((state, index) => {
        const position = `${index + 1}-я буква «${word[index]}»`;
        if (state === "correct") return `${position} — на своём месте`;
        if (state === "present") return `${position} — есть в ответе, но в другом месте`;
        return `${position} — лишняя или отсутствует в ответе`;
      });
      setStatus(`Пока не совпало. ${explanations.join("; ")}. Можно попробовать ещё раз.`, "retry");
      hasFeedback = true;
    });
    hint.addEventListener("click", () => {
      if (roundFinished || resolved() || composing || currentOutcome().hinted) return;
      startEvent();
      currentOutcome().hinted = true;
      hint.disabled = true;
      input.value = cleanAnswer(currentQuestion().answer)[0] + cleanAnswer(input.value).slice(1);
      renderLetters(input.value, ["hint"]);
      setStatus(`Первая буква — «${cleanAnswer(currentQuestion().answer)[0]}». Подсказка будет отмечена в результате.`, "hint");
      hasFeedback = false;
      focusWithoutScroll(input);
    });
    reveal.addEventListener("click", () => {
      if (roundFinished || resolved() || composing) return;
      startEvent();
      const answer = cleanAnswer(currentQuestion().answer);
      input.value = answer;
      renderLetters(answer, Array(answer.length).fill("revealed"));
      setStatus(`Ответ: ${answer}. Вы открыли ответ — он не засчитан как угаданный.`, "revealed");
      settleQuestion("revealed");
    });
    next.addEventListener("click", () => {
      if (roundFinished || !resolved() || currentIndex >= round.length - 1) return;
      currentIndex += 1;
      renderQuestion();
      focusWithoutScroll(nodes["quiz-clue"]);
    });
    finish.addEventListener("click", () => {
      if (roundFinished || currentIndex !== round.length - 1 || outcomes.some((entry) => !entry.outcome)) return;
      roundFinished = true;
      const summary = {
        unassisted: outcomes.filter((entry) => entry.outcome === "correct").length,
        assisted: outcomes.filter((entry) => entry.outcome === "assisted").length,
        revealed: outcomes.filter((entry) => entry.outcome === "revealed").length,
        hinted: outcomes.filter((entry) => entry.hinted).length,
        total: round.length,
      };
      summary.answered = summary.unassisted + summary.assisted;
      for (const [key, value] of Object.entries(summary)) result.dataset[key] = String(value);
      nodes["quiz-score"].textContent = `${summary.answered} из ${summary.total}`;
      nodes["quiz-score"].setAttribute("aria-label", `Угадано ${summary.answered} из ${summary.total}`);
      nodes["quiz-result-copy"].textContent = `Самостоятельно — ${summary.unassisted}, с подсказкой — ${summary.assisted}. Открыто ответов — ${summary.revealed}. Больше киноисторий — в бесплатной игре.`;
      const counts = document.createElement("p");
      counts.className = "quiz-result-counts";
      counts.textContent = `Самостоятельно: ${summary.unassisted}. С подсказкой: ${summary.assisted}. Открыто ответов: ${summary.revealed}. Использовано подсказок: ${summary.hinted}.`;
      const list = document.createElement("ol");
      for (let index = 0; index < round.length; index += 1) {
        const item = document.createElement("li");
        const heading = document.createElement("strong");
        heading.textContent = round[index].film;
        const outcome = document.createElement("p");
        outcome.textContent = { correct: "Вспомнили самостоятельно.", assisted: "Вспомнили с подсказкой.", revealed: "Открыли ответ — без балла." }[outcomes[index].outcome];
        const fact = document.createElement("p");
        fact.textContent = round[index].funFact;
        item.append(heading, outcome, fact);
        list.appendChild(item);
      }
      nodes["quiz-result-details"].replaceChildren(counts, list);
      nodes["quiz-question-panel"].hidden = true;
      result.hidden = false;
      emit("demo_complete", { ...summary, film: questionFilms[round[0].id], placement: "result" });
      showSection(result, result);
    });
    nodes["quiz-restart"].addEventListener("click", () => {
      beginRound(roundPreference, roundCampaign, { focus: true, placement: "result", track: true });
    });
    for (const link of document.querySelectorAll("[data-start-challenge]")) {
      link.addEventListener("click", (event) => {
        if (link.getAttribute("href") !== "#try") return;
        event.preventDefault();
        const firstId = link.id === "hero-preview-action" ? chooseFilmQuestion(selectedFilm || "collection") : preferredId;
        beginRound(firstId, campaignActive && firstId === "c-p-04", { focus: true, placement: "hero", track: true });
      });
    }
    for (const button of document.querySelectorAll("[data-question-id]")) {
      if (!byId.has(button.dataset.questionId)) continue;
      button.disabled = false;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        beginRound(button.dataset.questionId, false, { focus: true, placement: "film_card", track: true });
      });
    }
    if (!beginRound(roundPreference, roundCampaign)) return null;
    return {
      questionFilm: () => questionFilms[currentQuestion().id] || "all",
      roundFilm: () => roundCampaign ? "gentlemen" : questionFilms[roundPreference] || "all",
      hasQuestion: (slug) => Boolean(chooseFilmQuestion(slug)),
      selectPreview: (slug) => {
        selectedFilm = slug;
        preferredId = chooseFilmQuestion(slug);
        campaignActive = selection.challenge === "vasily-city" && slug === "gentlemen" && preferredId === "c-p-04";
      },
    };
  };

  const setupHero = (selection, quiz) => {
    const sceneNode = document.getElementById("hero-scene");
    const image = sceneNode?.matches("img") ? sceneNode : sceneNode?.querySelector("img");
    const caption = document.getElementById("hero-film");
    const video = document.getElementById("hero-motion");
    const toggle = document.getElementById("motion-toggle");
    const action = document.getElementById("hero-preview-action");
    const buttons = [...document.querySelectorAll("[data-preview-film]")].filter((button) => Object.hasOwn(previews, button.dataset.previewFilm));
    if (!image || !caption || !buttons.length) return;
    const motionPreference = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const connection = navigator.connection;
    let selected = selection.challenge === "vasily-city" && quiz?.hasQuestion("gentlemen") ? "gentlemen" : selection.film || "collection";
    let userMotion = null;
    let mediaFailed = false;
    let playGeneration = 0;
    const viewportNode = video?.parentElement || image;
    const rect = viewportNode.getBoundingClientRect();
    let inView = rect.bottom > 0 && rect.top < window.innerHeight;
    const supportsMotion = () => selected === "gentlemen" || selected === "collection";
    const wantsMotion = () => supportsMotion() && !mediaFailed && !document.hidden && inView
      && (userMotion === true || (userMotion !== false && !reducedMotion() && !connection?.saveData));
    const showMotionState = (playing) => {
      if (video) { video.hidden = !playing; video.dataset.state = mediaFailed ? "unavailable" : playing ? "playing" : "paused"; }
      image.dataset.motion = playing ? "playing" : "paused";
      if (toggle) {
        toggle.disabled = !supportsMotion() || mediaFailed || !video;
        toggle.setAttribute("aria-pressed", String(playing));
        toggle.textContent = mediaFailed ? "Анимация недоступна" : playing ? "Остановить анимацию" : "Включить анимацию";
      }
    };
    const syncMotion = () => {
      const generation = ++playGeneration;
      if (!video || !wantsMotion()) {
        if (video) video.pause();
        showMotionState(false);
        return;
      }
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      // Fixed same-origin delivery asset; no query string can pick media.
      const source = selected === "collection" ? "media/hero-cinema-loop.mp4" : "media/hero-vasily-loop.mp4";
      if (video.getAttribute("src") !== source) {
        video.pause();
        video.setAttribute("src", source);
      }
      const attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => {
          if (generation !== playGeneration || !wantsMotion()) return;
          showMotionState(true);
        }).catch(() => {
          if (generation !== playGeneration) return;
          userMotion = false;
          showMotionState(false);
        });
      }
    };
    const render = (slug, explicit = false) => {
      selected = slug;
      const film = previews[slug];
      if (slug === "collection") {
        image.setAttribute("src", "assets/web/hero-cinema-poster.webp");
        image.removeAttribute("srcset");
      } else {
        image.setAttribute("src", `assets/web/${film.art}-600.webp`);
        image.setAttribute("srcset", `assets/web/${film.art}-600.webp 600w, assets/web/${film.art}-1200.webp 1200w`);
      }
      image.setAttribute("sizes", "(max-width:700px) 92vw, 640px");
      image.alt = slug === "collection" ? "Иллюстрации из игры по любимым советским фильмам" : `Иллюстрация из игры по фильму «${film.title}»`;
      caption.textContent = film.title;
      for (const button of buttons) {
        button.disabled = false;
        button.setAttribute("aria-pressed", String(button.dataset.previewFilm === slug));
      }
      if (action) {
        const sample = quiz?.hasQuestion(slug);
        action.setAttribute("href", sample || slug === "collection" ? "#try" : "#films");
        action.textContent = slug === "collection" ? "Сыграть 3 вопроса →" : sample ? "Сыграть вопрос из фильма →" : "Найти фильм в коллекции →";
      }
      if (explicit) quiz?.selectPreview(slug);
      syncMotion();
    };
    for (const button of buttons) {
      button.addEventListener("click", () => {
        render(button.dataset.previewFilm, true);
        if (!button.hasAttribute("data-question-id") && button.closest(".film-featured")) {
          showSection(document.querySelector(".hero-art") || image, caption);
        }
      });
    }
    if (toggle && video) {
      toggle.addEventListener("click", () => {
        if (!supportsMotion() || mediaFailed) return;
        userMotion = video.paused || video.hidden;
        syncMotion();
      });
      video.addEventListener("playing", () => { if (wantsMotion()) showMotionState(true); else syncMotion(); });
      video.addEventListener("error", () => { mediaFailed = true; syncMotion(); });
      document.addEventListener("visibilitychange", syncMotion);
      window.addEventListener("pagehide", () => { video.pause(); showMotionState(false); });
      if (typeof IntersectionObserver === "function") {
        new IntersectionObserver((entries) => {
          inView = entries.some((entry) => entry.isIntersecting);
          syncMotion();
        }, { threshold: 0.1 }).observe(viewportNode);
      } else {
        window.addEventListener("scroll", () => {
          const bounds = viewportNode.getBoundingClientRect();
          const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
          if (visible !== inView) { inView = visible; syncMotion(); }
        }, { passive: true });
      }
      const changedPreference = () => { userMotion = null; syncMotion(); };
      motionPreference?.addEventListener?.("change", changedPreference);
      connection?.addEventListener?.("change", changedPreference);
    }
    render(selected);
    return { selectedFilm: () => selected === "collection" ? "all" : selected };
  };

  const setupFilmCatalog = () => {
    const input = document.getElementById("film-search");
    const list = document.getElementById("film-list");
    const count = document.getElementById("film-count");
    const empty = document.getElementById("film-empty");
    const catalog = document.getElementById("film-catalog");
    if (!input || !list || !count || !empty || !catalog) return;
    const entries = [...list.querySelectorAll("li.film-entry")].map((element) => ({
      element,
      key: searchKey(element.dataset.search || element.textContent),
    }));
    if (!entries.length) return;
    let previousQuery = null;
    const filterFilms = () => {
      const query = searchKey(input.value);
      if (query === previousQuery) return;
      previousQuery = query;
      const terms = query.split(" ").filter(Boolean);
      let matches = 0;
      for (const entry of entries) {
        const visible = terms.every((term) => entry.key.includes(term));
        entry.element.hidden = !visible;
        if (visible) matches += 1;
      }
      count.textContent = `Найдено: ${matches} из ${entries.length}`;
      empty.hidden = matches !== 0;
    };
    input.addEventListener("input", filterFilms);
    input.addEventListener("keyup", filterFilms);
    input.addEventListener("search", filterFilms);
    for (const button of document.querySelectorAll(".film-shortcut[data-film]")) {
      if (button.hasAttribute("data-question-id") || button.hasAttribute("data-preview-film")) continue;
      button.disabled = false;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        catalog.open = true;
        input.value = button.dataset.film;
        filterFilms();
        showSection(catalog, input);
      });
    }
    const previewAction = document.getElementById("hero-preview-action");
    previewAction?.addEventListener("click", (event) => {
      if (previewAction.getAttribute("href") !== "#films") return;
      event.preventDefault();
      catalog.open = true;
      input.value = "Служебный роман";
      filterFilms();
      showSection(catalog, input);
    });
    filterFilms();
  };

  const setupStoreClicks = (quiz, hero) => {
    for (const link of document.querySelectorAll("a[href]")) {
      let url;
      try { url = new URL(link.href); } catch (_) { continue; }
      const store = url.protocol === "https:" && url.hostname === "apps.apple.com" && /\/id6812753192(?:\/|$)/.test(url.pathname)
        ? "app_store" : url.protocol === "https:" && url.hostname === "play.google.com" && url.pathname === "/store/apps/details" && url.searchParams.get("id") === "com.krostudios.sovietkino"
          ? "google_play" : null;
      if (!store) continue;
      link.addEventListener("click", () => {
        const placement = link.closest("#quiz-result") ? "result"
          : link.closest(".mobile-download") ? "sticky"
            : link.closest(".hero") ? "hero"
              : link.closest("#quiz-payoff") ? "question"
                : link.closest(".final") ? "footer" : "download";
        const film = placement === "question" ? quiz?.questionFilm()
          : placement === "result" ? quiz?.roundFilm() : hero?.selectedFilm();
        emit("store_click", { placement, store, film: film || "all" });
      });
    }
  };

  const initialise = () => {
    document.documentElement.classList.add("js");
    const selection = initialSelection();
    const quiz = setupQuiz(selection);
    const hero = setupHero(selection, quiz);
    setupFilmCatalog();
    setupStoreClicks(quiz, hero);
    emit("page_view", { film: selection.challenge === "vasily-city" ? "gentlemen" : selection.film || "all", placement: "page" });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
  else initialise();
})();
