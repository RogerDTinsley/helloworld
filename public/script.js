const COOKIE_NAME = "workouts";
const EMAIL_COOKIE = "userEmail";
const tbody = document.getElementById("workout-tbody");
const emailSection = document.getElementById("email-section");

let workouts = [];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadWorkouts() {
  const raw = getCookie(COOKIE_NAME);
  if (raw) {
    try {
      workouts = JSON.parse(raw);
      if (!Array.isArray(workouts)) workouts = [];
    } catch {
      workouts = [];
    }
  } else {
    workouts = [];
  }
  sortWorkouts();
  renderEmailSection();
  renderTable();
}

function saveWorkouts() {
  setCookie(COOKIE_NAME, JSON.stringify(workouts));
}

function sortWorkouts() {
  workouts.sort((a, b) => {
    const da = a.date + "T" + (a.time || "00:00");
    const db = b.date + "T" + (b.time || "00:00");
    return db.localeCompare(da);
  });
}

function buildTimeOptions(selected = "07:00") {
  let html = "";
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const val = `${hh}:${mm}`;
      const sel = val === selected ? " selected" : "";
      html += `<option value="${val}"${sel}>${val}</option>`;
    }
  }
  return html;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getLatestDefaults() {
  if (workouts.length === 0) {
    return { type: "walk", distance: "" };
  }
  return {
    type: workouts[0].type || "walk",
    distance: workouts[0].distance != null ? workouts[0].distance : ""
  };
}

function createInputRow() {
  const defaults = getLatestDefaults();
  const tr = document.createElement("tr");
  tr.className = "input-row";
  tr.innerHTML = `
    <td><input type="date" id="new-date" value="${getToday()}"></td>
    <td><select id="new-time">${buildTimeOptions("07:00")}</select></td>
    <td>
      <select id="new-type">
        <option value="walk"${defaults.type === "walk" ? " selected" : ""}>Walk</option>
        <option value="run"${defaults.type === "run" ? " selected" : ""}>Run</option>
        <option value="swim"${defaults.type === "swim" ? " selected" : ""}>Swim</option>
        <option value="bike"${defaults.type === "bike" ? " selected" : ""}>Bike</option>
        <option value="other"${defaults.type === "other" ? " selected" : ""}>Other</option>
      </select>
    </td>
    <td><input type="number" id="new-distance" step="0.01" min="0" value="${defaults.distance}" placeholder="0.00"></td>
    <td><input type="number" id="new-pace" step="0.1" min="0" placeholder="min/mi"></td>
    <td><input type="number" id="new-temp" step="0.1" placeholder="°F"></td>
    <td><input type="text" id="new-weather" placeholder="Sunny, rainy…"></td>
    <td><input type="text" id="new-comments" placeholder="Notes"></td>
    <td>
      <button type="button" class="btn-save" id="btn-add-save">Save</button>
      <button type="button" class="btn-cancel" id="btn-add-cancel">Cancel</button>
    </td>
  `;
  return tr;
}

function clearInputRow() {
  document.getElementById("new-date").value = getToday();
  document.getElementById("new-time").value = "07:00";
  const defaults = getLatestDefaults();
  document.getElementById("new-type").value = defaults.type;
  document.getElementById("new-distance").value = defaults.distance;
  document.getElementById("new-pace").value = "";
  document.getElementById("new-temp").value = "";
  document.getElementById("new-weather").value = "";
  document.getElementById("new-comments").value = "";
}

function collectInputValues(prefix = "new-") {
  return {
    date: document.getElementById(prefix + "date").value,
    time: document.getElementById(prefix + "time").value,
    type: document.getElementById(prefix + "type").value,
    distance: parseFloat(document.getElementById(prefix + "distance").value) || 0,
    pace: parseFloat(document.getElementById(prefix + "pace").value) || 0,
    temp: document.getElementById(prefix + "temp").value
      ? parseFloat(document.getElementById(prefix + "temp").value)
      : null,
    weather: document.getElementById(prefix + "weather").value.trim(),
    comments: document.getElementById(prefix + "comments").value.trim()
  };
}

function renderEmailSection() {
  const email = getCookie(EMAIL_COOKIE);
  emailSection.innerHTML = "";

  if (email && isValidEmail(email)) {
    emailSection.innerHTML = `
      <span class="registered-email">Registered: ${email}</span>
      <button type="button" class="btn-email" id="btn-send-email">Email all workouts</button>
      <button type="button" class="btn-change-email" id="btn-change-email">Change email</button>
    `;
    document.getElementById("btn-send-email").addEventListener("click", sendEmail);
    document.getElementById("btn-change-email").addEventListener("click", () => {
      setCookie(EMAIL_COOKIE, "", -1);
      renderEmailSection();
    });
  } else {
    emailSection.innerHTML = `
      <input type="email" id="reg-email" placeholder="you@example.com">
      <button type="button" class="btn-register" id="btn-register">Register my email</button>
    `;
    document.getElementById("btn-register").addEventListener("click", () => {
      const val = document.getElementById("reg-email").value.trim();
      if (!isValidEmail(val)) {
        alert("Please enter a valid email address.");
        return;
      }
      setCookie(EMAIL_COOKIE, val);
      renderEmailSection();
    });
  }
}

async function sendEmail() {
  const email = getCookie(EMAIL_COOKIE);
  if (!email || !isValidEmail(email)) {
    alert("No valid email registered.");
    return;
  }
  if (workouts.length === 0) {
    alert("No workouts to send.");
    return;
  }

  const btn = document.getElementById("btn-send-email");
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, workouts })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send");
    alert("Email sent successfully!");
  } catch (err) {
    console.error(err);
    alert("Could not send email: " + (err.message || "Unknown error"));
  } finally {
    btn.disabled = false;
    btn.textContent = "Email all workouts";
  }
}

function renderTable() {
  tbody.innerHTML = "";

  // Always show the blank input row first
  const inputRow = createInputRow();
  tbody.appendChild(inputRow);

  document.getElementById("btn-add-save").addEventListener("click", () => {
    const data = collectInputValues("new-");
    if (!data.date || !data.time) {
      alert("Date and time are required.");
      return;
    }
    const workout = { id: generateId(), ...data };
    workouts.unshift(workout);
    sortWorkouts();
    saveWorkouts();
    renderTable();
  });

  document.getElementById("btn-add-cancel").addEventListener("click", clearInputRow);

  if (workouts.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.innerHTML = `<td colspan="9" class="empty-message">No workouts yet. Add your first one above!</td>`;
    tbody.appendChild(emptyTr);
    return;
  }

  workouts.forEach((w) => {
    const tr = document.createElement("tr");
    tr.dataset.id = w.id;
    tr.innerHTML = `
      <td>${w.date}</td>
      <td>${w.time}</td>
      <td>${w.type}</td>
      <td>${w.distance}</td>
      <td>${w.pace}</td>
      <td>${w.temp != null ? w.temp : ""}</td>
      <td>${w.weather || ""}</td>
      <td>${w.comments || ""}</td>
      <td>
        <button type="button" class="btn-edit">Edit</button>
        <button type="button" class="btn-delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".btn-edit").addEventListener("click", () => startInlineEdit(tr, w));
    tr.querySelector(".btn-delete").addEventListener("click", () => {
      if (!confirm("Delete this workout?")) return;
      workouts = workouts.filter((item) => item.id !== w.id);
      saveWorkouts();
      renderTable();
    });
  });
}

function startInlineEdit(tr, w) {
  tr.classList.add("editing");
  tr.innerHTML = `
    <td><input type="date" class="edit-date" value="${w.date}"></td>
    <td><select class="edit-time">${buildTimeOptions(w.time || "07:00")}</select></td>
    <td>
      <select class="edit-type">
        <option value="walk"${w.type === "walk" ? " selected" : ""}>Walk</option>
        <option value="run"${w.type === "run" ? " selected" : ""}>Run</option>
        <option value="swim"${w.type === "swim" ? " selected" : ""}>Swim</option>
        <option value="bike"${w.type === "bike" ? " selected" : ""}>Bike</option>
        <option value="other"${w.type === "other" ? " selected" : ""}>Other</option>
      </select>
    </td>
    <td><input type="number" class="edit-distance" step="0.01" min="0" value="${w.distance != null ? w.distance : ""}"></td>
    <td><input type="number" class="edit-pace" step="0.1" min="0" value="${w.pace != null ? w.pace : ""}"></td>
    <td><input type="number" class="edit-temp" step="0.1" value="${w.temp != null ? w.temp : ""}"></td>
    <td><input type="text" class="edit-weather" value="${w.weather || ""}"></td>
    <td><input type="text" class="edit-comments" value="${w.comments || ""}"></td>
    <td>
      <button type="button" class="btn-save">Save</button>
      <button type="button" class="btn-cancel">Cancel</button>
    </td>
  `;

  tr.querySelector(".btn-save").addEventListener("click", () => {
    const updated = {
      id: w.id,
      date: tr.querySelector(".edit-date").value,
      time: tr.querySelector(".edit-time").value,
      type: tr.querySelector(".edit-type").value,
      distance: parseFloat(tr.querySelector(".edit-distance").value) || 0,
      pace: parseFloat(tr.querySelector(".edit-pace").value) || 0,
      temp: tr.querySelector(".edit-temp").value
        ? parseFloat(tr.querySelector(".edit-temp").value)
        : null,
      weather: tr.querySelector(".edit-weather").value.trim(),
      comments: tr.querySelector(".edit-comments").value.trim()
    };

    if (!updated.date || !updated.time) {
      alert("Date and time are required.");
      return;
    }

    const index = workouts.findIndex((item) => item.id === w.id);
    if (index !== -1) {
      workouts[index] = updated;
      sortWorkouts();
      saveWorkouts();
      renderTable();
    }
  });

  tr.querySelector(".btn-cancel").addEventListener("click", () => {
    renderTable();
  });
}

// Start
loadWorkouts();