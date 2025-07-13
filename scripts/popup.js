
let input = null;
const historyDiv = document.getElementById("history");
const clearAll = document.getElementById("clear-all");
const toggle = document.getElementById("multi-line-toggle");
let history = [];
let pointer = -1;
const scope = {};

function renderInput() {
  const container = document.getElementById("input-container");
  const isMultiLine = toggle.checked;

  container.innerHTML = "";
  input = document.createElement(isMultiLine ? "textarea" : "input");
  input.id = "input";
  input.className = "calc-input";
  input.autofocus = true;
  container.appendChild(input);
  input.focus();

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
  history.forEach(entry => {
    const q = document.createElement("div");
    q.className = "history-item";
    q.textContent = entry.query;
    q.onclick = () => input.value = entry.query;
    historyDiv.appendChild(q);
    const r = document.createElement("div");
    r.className = "history-item";
    r.textContent = entry.result;
    r.onclick = () => input.value = entry.result;
    historyDiv.appendChild(r);
  });
  historyDiv.scrollTop = historyDiv.scrollHeight;
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

toggle.addEventListener("change", renderInput);
document.addEventListener("DOMContentLoaded", () => {
  renderInput();
  loadHistory();
});
