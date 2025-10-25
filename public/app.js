const optionContainer = document.querySelector('#options-container');
const addOptionButton = document.querySelector('#add-option');
const createPollForm = document.querySelector('#create-poll-form');
const createStatus = document.querySelector('#create-status');
const loadPollForm = document.querySelector('#load-poll-form');
const loadStatus = document.querySelector('#load-status');
const pollSection = document.querySelector('#poll-section');
const pollQuestion = document.querySelector('#poll-question');
const pollMeta = document.querySelector('#poll-meta');
const pollStatus = document.querySelector('#poll-status');
const pollOptions = document.querySelector('#poll-options');

let refreshTimer = null;
const REFRESH_INTERVAL = 2000;

function setStatus(element, message, { tone = 'error' } = {}) {
  element.textContent = message;
  element.classList.remove('success');
  if (tone === 'success') {
    element.classList.add('success');
  }
}

function clearStatus(element) {
  element.textContent = '';
  element.classList.remove('success');
}

function optionFieldTemplate(value = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.value = value;
  input.placeholder = 'Enter an option';
  return input;
}

function ensureMinimumOptions() {
  while (optionContainer.children.length < 2) {
    optionContainer.append(optionFieldTemplate());
  }
}

function collectOptions() {
  return Array.from(optionContainer.querySelectorAll('input'))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function stopPolling() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startPolling(pollId) {
  stopPolling();
  refreshTimer = setInterval(() => {
    fetchPoll(pollId, { silent: true });
  }, REFRESH_INTERVAL);
}

async function fetchJSON(url, options) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

function renderPoll(poll) {
  pollSection.classList.remove('hidden');
  pollQuestion.textContent = poll.question;

  const created = poll.created_at ? `Created at ${poll.created_at}` : '';
  pollMeta.textContent = `Poll #${poll.id}${created ? ` • ${created}` : ''}`;

  pollOptions.innerHTML = '';
  poll.options.forEach((option) => {
    const item = document.createElement('div');
    item.className = 'vote-option';

    const label = document.createElement('span');
    label.textContent = `${option.text} — ${option.votes} vote${option.votes === 1 ? '' : 's'}`;

    const voteButton = document.createElement('button');
    voteButton.type = 'button';
    voteButton.textContent = 'Vote';
    voteButton.addEventListener('click', async () => {
      try {
        clearStatus(pollStatus);
        const updated = await fetchJSON(`/poll/${poll.id}/vote`, {
          method: 'POST',
          body: JSON.stringify({ optionId: option.id }),
        });
        renderPoll(updated);
      } catch (error) {
        setStatus(pollStatus, error.message);
      }
    });

    item.append(label, voteButton);
    pollOptions.append(item);
  });
}

async function fetchPoll(pollId, { silent = false } = {}) {
  try {
    if (!silent) {
      clearStatus(loadStatus);
      clearStatus(pollStatus);
    }
    const poll = await fetchJSON(`/poll/${pollId}`);
    renderPoll(poll);
    if (!silent) {
      setStatus(loadStatus, `Poll #${poll.id} loaded.`, { tone: 'success' });
    }
    startPolling(poll.id);
  } catch (error) {
    stopPolling();
    setStatus(silent ? pollStatus : loadStatus, error.message);
    if (!silent) {
      pollSection.classList.add('hidden');
    }
  }
}

addOptionButton.addEventListener('click', () => {
  optionContainer.append(optionFieldTemplate());
});

createPollForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus(createStatus);
  const question = createPollForm.question.value.trim();
  const options = collectOptions();

  if (!question) {
    setStatus(createStatus, 'Question is required.');
    return;
  }

  if (options.length < 2) {
    setStatus(createStatus, 'Please provide at least two options.');
    return;
  }

  try {
    const poll = await fetchJSON('/poll', {
      method: 'POST',
      body: JSON.stringify({ question, options }),
    });
    setStatus(createStatus, `Poll created (ID: ${poll.id}).`, { tone: 'success' });
    createPollForm.reset();
    optionContainer.innerHTML = '';
    ensureMinimumOptions();
    await fetchPoll(poll.id);
  } catch (error) {
    setStatus(createStatus, error.message);
  }
});

loadPollForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const pollId = Number.parseInt(loadPollForm['poll-id'].value, 10);
  if (Number.isNaN(pollId)) {
    setStatus(loadStatus, 'Please enter a valid poll ID.');
    return;
  }
  await fetchPoll(pollId);
});

window.addEventListener('beforeunload', () => {
  stopPolling();
});

ensureMinimumOptions();
