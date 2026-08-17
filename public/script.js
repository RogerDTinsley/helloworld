const COOKIE_NAME = "workouts";
const form = document.getElementById("workout-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const listEl = document.getElementById("workouts-list");

let workouts = [];
let editingId = null;

// Cookie helpers
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
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

// Render list
function renderWorkouts() {
  listEl.innerHTML = "";

  if (workouts.length === 0) {
    listEl.innerHTML = `<p class="empty-message">No workouts yet. Add your first one above!</p>`;
    return;
  }

  workouts.forEach((w) => {
    const card = document.createElement("div");
    card.className = "workout-card";
    card.innerHTML = `
      <h3>${w.type}</h3>
      <p><strong>Date:</strong> ${w.date} &nbsp;|&nbsp; <strong>Time:</strong> ${w.time}</p>
      <p><strong>Distance:</strong> ${w.distance} mi &nbsp;|&nbsp; <strong>Pace:</strong> ${w.pace} min/mi</p>
      <p><strong>Temp:</strong> ${w.temp ? w.temp + "°F" : "—"} &nbsp;|&nbsp; <strong>Weather:</strong> ${w.weather || "—"}</p>
      <p><strong>Comments:</strong> ${w.comments || "—"}</p>
      <div class="workout-actions">
        <button class="edit-btn" data-id="${w.id}">Edit</button>
        <button class="delete-btn" data-id="${w.id}">Delete</button>
      </div>
    `;
    listEl.appendChild(card);
  });

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
  document.getElementById("temp").value = w.temp || "";
  document.getElementById("weather").value = w.weather || "";
  document.getElementById("comments").value = w.comments || "";

  formTitle.textContent = "Edit Workout";
  submitBtn.textContent = "Update Workout";
  cancelBtn.classList.remove("hidden");

  // Scroll to form
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
    id: editingId || crypto.randomUUID(),
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
    // Update existing
    const idx = workouts.findIndex((w) => w.id === editingId);
    if (idx !== -1) workouts[idx] = workout;
  } else {
    // Add to front of list
    workouts.unshift(workout);
  }

  saveWorkouts();
  renderWorkouts();
  clearForm();
});

cancelBtn.addEventListener("click", clearForm);

// Init
loadWorkouts();