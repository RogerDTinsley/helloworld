const COOKIE_NAME = "workouts";
const form = document.getElementById("workout-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const listEl = document.getElementById("workouts-list");

let workouts = [];
let editingId = null;

// Robust unique ID that works everywhere (including file://)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Cookie helpers (more reliable parsing)
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
  renderWorkouts();
}

function saveWorkouts() {
  setCookie(COOKIE_NAME, JSON.stringify(workouts));
}

// Render as a table (1 line / row per workout)
function renderWorkouts() {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (workouts.length === 0) {
    listEl.innerHTML = `<p class="empty-message">No workouts yet. Add your first one above!</p>`;
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Type</th>
        <th>Distance (mi)</th>
        <th>Pace (min/mi)</th>
        <th>Temp (°F)</th>
        <th>Weather</th>
        <th>Comments</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  workouts.forEach((w) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${w.date || "-"}</td>
      <td>${w.time || "-"}</td>
      <td>${w.type || "-"}</td>
      <td>${w.distance != null ? w.distance : "-"}</td>
      <td>${w.pace != null ? w.pace : "-"}</td>
      <td>${w.temp != null ? w.temp : "-"}</td>
      <td>${w.weather || "-"}</td>
      <td>${w.comments || "-"}</td>
      <td>
        <div class="workout-actions">
          <button type="button" class="edit-btn" data-id="${w.id}">Edit</button>
          <button type="button" class="delete-btn" data-id="${w.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  listEl.appendChild(table);

  // Attach event listeners
  listEl.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id));
  });
  listEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteWorkout(btn.dataset.id));
  });
}

// Form helpers
function clearForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Add New Workout";
  submitBtn.textContent = "Add Workout";
  cancelBtn.classList.add("hidden");
}

function startEdit(id) {
  const w = workouts.find((item) => item.id === id);
  if (!w) return;

  editingId = id;
  document.getElementById("date").value = w.date;
  document.getElementById("time").value = w.time;
  document.getElementById("type").value = w.type;
  document.getElementById("distance").value = w.distance;
  document.getElementById("pace").value = w.pace;
  document.getElementById("temp").value = w.temp != null ? w.temp : "";
  document.getElementById("weather").value = w.weather || "";
  document.getElementById("comments").value = w.comments || "";

  formTitle.textContent = "Edit Workout";
  submitBtn.textContent = "Update Workout";
  cancelBtn.classList.remove("hidden");

  form.scrollIntoView({ behavior: "smooth" });
}

function deleteWorkout(id) {
  if (!confirm("Delete this workout?")) return;
  workouts = workouts.filter((w) => w.id !== id);
  saveWorkouts();
  renderWorkouts();
  if (editingId === id) clearForm();
}

// Form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const workout = {
    id: editingId || generateId(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    type: document.getElementById("type").value,
    distance: parseFloat(document.getElementById("distance").value),
    pace: parseFloat(document.getElementById("pace").value),
    temp: document.getElementById("temp").value
      ? parseFloat(document.getElementById("temp").value)
      : null,
    weather: document.getElementById("weather").value.trim(),
    comments: document.getElementById("comments").value.trim()
  };

  if (editingId) {
    const idx = workouts.findIndex((w) => w.id === editingId);
    if (idx !== -1) workouts[idx] = workout;
  } else {
    // Add to front of the list
    workouts.unshift(workout);
  }

  saveWorkouts();
  renderWorkouts();
  clearForm();
});

cancelBtn.addEventListener("click", clearForm);

// Init
loadWorkouts();