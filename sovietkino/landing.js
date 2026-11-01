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

  const letterNoun = (count) => {
    if (count % 100 >= 11 && count % 100 <= 14) return "букв";
    if (count % 10 === 1) return "буква";
    if (count % 10 >= 2 && count % 10 <= 4) return "буквы";
    return "букв";
  };

  const focusWithoutScroll = (element) => {
    try {
      element.focus({ preventScroll: true });
    } catch (_) {
      element.focus();
    }
  };

  // The dataset is local editorial content; never turn a quiz image into an
  // external request if a malformed URL finds its way into that content.
  const localArtwork = (value) => {
    if (typeof value !== "string" || !value || value.includes("\\")) return false;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return false;
    if (value.split("/").some((part) => part === "..")) return false;
    return /^(?:\.\/|\/)?[a-z0-9_./-]+\.(?:avif|webp|png|jpe?g)$/i.test(value);
  };

  const validQuestion = (question) => {
    if (!question || typeof question !== "object") return false;
    const required = ["id", "clue", "answer", "film", "funFact", "category"];
    if (!required.every((key) => typeof question[key] === "string" && question[key].trim())) return false;
    if (!/^[А-ЯЁа-яё]{1,12}$/.test(question.answer)) return false;
    if (!Number.isInteger(Number(question.year)) || Number(question.year) < 1895 || Number(question.year) > 2100) return false;
    if (!Array.isArray(question.acceptedAnswers)
      || !question.acceptedAnswers.every((answer) => typeof answer === "string" && /^[А-ЯЁа-яё]{1,12}$/.test(answer))) return false;
    return localArtwork(question.art)
      && (!question.art2x || localArtwork(question.art2x));
  };

  const wordFeedback = (guess, answer) => {
    const states = Array(guess.length).fill("absent");
    const remaining = new Map();

    // Remove exact matches before assigning the remaining occurrences. This
    // prevents one answer letter from colouring several repeated guesses.
    for (let index = 0; index < answer.length; index += 1) {
      if (guess[index] === answer[index]) {
        states[index] = "correct";
      } else {
        remaining.set(answer[index], (remaining.get(answer[index]) || 0) + 1);
      }
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

  const setupQuiz = () => {
    const ids = ["quiz-data", "quiz-art", "quiz-category", "quiz-progress", "quiz-clue",
      "quiz-length", "quiz-form", "quiz-answer", "quiz-submit", "quiz-letters",
      "quiz-status", "quiz-payoff", "quiz-film", "quiz-fact", "quiz-reveal", "quiz-next"];
    const nodes = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    if (!ids.every((id) => nodes[id])) return;

    const input = nodes["quiz-answer"];
    const submit = nodes["quiz-submit"];
    const reveal = nodes["quiz-reveal"];
    const next = nodes["quiz-next"];
    const status = nodes["quiz-status"];
    let questions;

    try {
      questions = JSON.parse(nodes["quiz-data"].textContent);
      if (!Array.isArray(questions) || !questions.length || !questions.every(validQuestion)) {
        throw new Error("Invalid quiz data");
      }
    } catch (_) {
      input.disabled = true;
      submit.disabled = true;
      reveal.disabled = true;
      next.disabled = true;
      status.textContent = "Пример временно недоступен. Другие вопросы ждут вас в приложении.";
      return;
    }

    let currentIndex = 0;
    let completed = false;
    let hasFeedback = false;
    let composing = false;
    const currentQuestion = () => questions[currentIndex];

    const setStatus = (message, state = "") => {
      status.textContent = message;
      status.dataset.state = state;
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

    const showPayoff = () => {
      const question = currentQuestion();
      nodes["quiz-film"].textContent = `${question.film} · ${question.year}`;
      nodes["quiz-fact"].textContent = question.funFact;
      nodes["quiz-payoff"].hidden = false;
      completed = true;
      input.disabled = true;
      submit.disabled = true;
      reveal.disabled = true;
    };

    const renderQuestion = () => {
      const question = currentQuestion();
      completed = false;
      hasFeedback = false;
      input.value = "";
      input.disabled = false;
      submit.disabled = false;
      reveal.disabled = false;
      next.disabled = false;
      nodes["quiz-category"].textContent = question.category;
      nodes["quiz-progress"].textContent = `Вопрос ${currentIndex + 1} из ${questions.length}`;
      nodes["quiz-clue"].textContent = question.clue;
      nodes["quiz-length"].textContent = `Ответ — ${question.answer.length} ${letterNoun(question.answer.length)}.`;
      if (nodes["quiz-art"].getAttribute("src") !== question.art) {
        nodes["quiz-art"].setAttribute("src", question.art);
      }
      if (question.art2x) {
        nodes["quiz-art"].setAttribute("srcset", `${question.art} 1x, ${question.art2x} 2x`);
      } else {
        nodes["quiz-art"].removeAttribute("srcset");
      }
      nodes["quiz-payoff"].hidden = true;
      nodes["quiz-film"].textContent = "";
      nodes["quiz-fact"].textContent = "";
      setStatus("");
      renderLetters();
    };

    const normaliseInput = () => {
      if (completed || composing) return;
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
      renderLetters(input.value);
      if (hasFeedback) {
        setStatus("");
        hasFeedback = false;
      }
    };

    input.addEventListener("compositionstart", () => { composing = true; });
    input.addEventListener("compositionend", () => {
      composing = false;
      normaliseInput();
    });
    input.addEventListener("input", normaliseInput);

    nodes["quiz-form"].addEventListener("submit", (event) => {
      event.preventDefault();
      if (completed || composing) return;
      normaliseInput();
      const question = currentQuestion();
      const word = input.value;
      const key = answerKey(word);
      const accepted = new Set([question.answer, ...question.acceptedAnswers].map(answerKey));

      if (accepted.has(key)) {
        renderLetters(word, Array(word.length).fill("correct"));
        setStatus(`Верно! ${cleanAnswer(question.answer)}. Попробуете следующий вопрос?`, "correct");
        showPayoff();
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

    reveal.addEventListener("click", () => {
      if (completed) return;
      const answer = cleanAnswer(currentQuestion().answer);
      input.value = answer;
      renderLetters(answer, Array(answer.length).fill("revealed"));
      setStatus(`Ответ: ${answer}. Вы открыли ответ. Попробуйте следующий вопрос.`, "revealed");
      showPayoff();
    });

    next.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % questions.length;
      renderQuestion();
      focusWithoutScroll(input);
    });

    renderQuestion();
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
    // The search event also covers the native clear control in search fields.
    input.addEventListener("search", filterFilms);
    for (const button of document.querySelectorAll(".film-shortcut[data-film]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        catalog.open = true;
        input.value = button.dataset.film;
        filterFilms();
        const reduceMotion = !window.matchMedia
          || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        catalog.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        focusWithoutScroll(input);
      });
    }
    filterFilms();
  };

  const initialise = () => {
    document.documentElement.classList.add("js");
    setupQuiz();
    setupFilmCatalog();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
