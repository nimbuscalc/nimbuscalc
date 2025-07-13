
let input = null;
const historyDiv = document.getElementById("history");
const clearAll = document.getElementById("clear-all");
const toggle = document.getElementById("multi-line-toggle");
const increaseFontSize = document.getElementById("increase-font-size");
const decreaseFontSize = document.getElementById("decrease-font-size");
let history = [];
let settings = {fontSize: 1};
let pointer = -1;
const scope = {};

function renderInput() {
  const container = document.getElementById("input-container");
  const isMultiLine = toggle.checked;

  container.innerHTML = "";
  input = document.createElement(isMultiLine ? "textarea" : "input");
  input.id = "input";
  input.className = "calc-input";
  container.appendChild(input);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !isMultiLine) {
      e.preventDefault();
      evaluateInput();
    } else if (e.key === "Enter" && e.ctrlKey && isMultiLine) {
      e.preventDefault();
      evaluateInput();
    } else if (e.key === "ArrowUp") {
      if (pointer > 0) {
        pointer--;
        input.value = history[pointer].query;
      }
    } else if (e.key === "ArrowDown") {
      if (pointer < history.length - 1) {
        pointer++;
        input.value = history[pointer].query;
      } else if (pointer === history.length - 1) {
        pointer++;
        input.value = "";
      }
    }
  });
}

function renderHistory() {
  historyDiv.innerHTML = "";
  historyDiv.style.fontSize = settings.fontSize + "em";
  history.forEach(entry => {
    const q = document.createElement("div");
    q.className = "history-item";
    q.textContent = entry.query;
    q.onclick = () => {input.value += entry.query; input.focus()};
    historyDiv.appendChild(q);
    const r = document.createElement("div");
    r.className = "history-item";
    r.textContent = entry.result;
    r.onclick = () => {input.value += entry.result; input.focus()};
    historyDiv.appendChild(r);
  });
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function saveSettings() {
  chrome.storage.local.set({ settings });
}

function loadSettings() {
  chrome.storage.local.get("settings", data => {
    settings = data.settings || {};
  });
}

function saveHistory() {
  chrome.storage.local.set({ history });
}

function loadHistory() {
  chrome.storage.local.get("history", data => {
    history = data.history || [];
    renderHistory();
  });
}

function evaluateInput() {
  const expr = input.value.trim();
  if (!expr) return;

  try {
    const parsed = math.parse(expr);
    const nodes = Array.isArray(parsed)
      ? parsed
      : parsed.isBlockNode
      ? parsed.blocks.map(b => b.node)
      : [parsed];

    const isMultiLine = toggle.checked || expr.includes("\n");
    if (!isMultiLine && nodes.length > 1) {
      throw new Error("Multiple expressions not allowed in single-line mode.");
    }

    const results = nodes.map(n => {
      const code = n.toString();
      const val = n.evaluate(scope);
      return typeof val === "function"
        ? `[function ${code.split('=')[0].trim()}]`
        : val;
    });

    const resultStr = results.length === 1 ? String(results[0]) : `[${results.join(", ")}]`;

    history.push({ query: expr, result: resultStr });
    if (history.length > 100) history.shift();
    saveHistory();
    renderHistory();
    input.value = "";
    pointer = history.length;
  } catch (e) {
    history.push({ query: expr, result: "Error" });
    saveHistory();
    renderHistory();
    input.value = "";
    pointer = history.length;
  }
}

clearAll.onclick = () => {
  history = [];
  for (let key in scope) delete scope[key];
  saveHistory();
  renderHistory();
};

decreaseFontSize.onclick = () => {
  if (!settings.fontSize) {
    settings.fontSize = 1;
  }
  settings.fontSize -= .1;
  // Lower than .5 has no effect, so don't let it go lower (otherwise it's harder to get back to something legible)
  if (settings.fontSize < .5) {
    settings.fontSize = .5;
  }
  saveSettings();
  renderHistory();
}

increaseFontSize.onclick = () => {
  if (!settings.fontSize) {
    settings.fontSize = 1;
  }
  settings.fontSize += .1;
  saveSettings();
  renderHistory();
}

toggle.addEventListener("change", renderInput);
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  renderInput();
  loadHistory();
});
