const COOKIE_NAME = "workouts";
const tbody = document.getElementById("workouts-body");

let workouts = [];
let editingId = null;

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Cookie helpers
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
  // Ensure descending date/time order
  sortWorkouts();
  renderTable();
}

function saveWorkouts() {
  setCookie(COOKIE_NAME, JSON.stringify(workouts));
}

function sortWorkouts() {
  workouts.sort((a, b) => {
    const da = a.date + "T" + (a.time || "00:00");
    const db = b.date + "T" + (b.time || "00:00");
    return db.localeCompare(da); // descending
  });
}

// Build time <select> options (5:00 AM – 11:45 PM, 15-min steps)
function buildTimeOptions(selectedValue = "") {
  let html = '<option value="">--</option>';
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      const sel = value === selectedValue ? " selected" : "";
      html += `<option value="${value}"${sel}>${label}</option>`;
    }
  }
  return html;
}

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getDefaultTypeAndDistance() {
  if (workouts.length > 0) {
    return {
      type: workouts[0].type || "walk",
      distance: workouts[0].distance != null ? workouts[0].distance : ""
    };
  }
  return { type: "walk", distance: "" };
}

function clearNewRow() {
  const defaults = getDefaultTypeAndDistance();
  document.getElementById("new-date").value = getToday();
  document.getElementById("new-time").value = "";
  document.getElementById("new-type").value = defaults.type;
  document.getElementById("new-distance").value = defaults.distance;
  document.getElementById("new-pace").value = "";
  document.getElementById("new-temp").value = "";
  document.getElementById("new-weather").value = "";
  document.getElementById("new-comments").value = "";
}

function renderTable() {
  const defaults = getDefaultTypeAndDistance();
  let html = `
    <tr id="new-row">
      <td><input type="date" id="new-date" value="${getToday()}"></td>
      <td><select id="new-time">${buildTimeOptions()}</select></td>
      <td>
        <select id="new-type">
          <option value="walk"${defaults.type === "walk" ? " selected" : ""}>walk</option>
          <option value="run"${defaults.type === "run" ? " selected" : ""}>run</option>
          <option value="swim"${defaults.type === "swim" ? " selected" : ""}>swim</option>
          <option value="bike"${defaults.type === "bike" ? " selected" : ""}>bike</option>
          <option value="other"${defaults.type === "other" ? " selected" : ""}>other</option>
        </select>
      </td>
      <td><input type="number" id="new-distance" step="0.01" min="0" value="${defaults.distance}" placeholder="0.00"></td>
      <td><input type="number" id="new-pace" step="0.01" min="0" placeholder="0.00"></td>
      <td><input type="number" id="new-temp" step="0.1" placeholder="°F"></td>
      <td><input type="text" id="new-weather" placeholder="sunny, rain..."></td>
      <td><textarea id="new-comments" rows="1" placeholder="notes..."></textarea></td>
      <td class="actions">
        <button type="button" class="btn-save" id="save-new">Save</button>
        <button type="button" class="btn-cancel" id="cancel-new">Cancel</button>
      </td>
    </tr>
  `;

  if (workouts.length === 0) {
    html += `<tr><td colspan="9" class="empty-message">No workouts yet. Enter your first one above!</td></tr>`;
  } else {
    workouts.forEach((w) => {
      if (editingId === w.id) {
        // Editable row
        html += `
          <tr data-id="${w.id}">
            <td><input type="date" class="edit-date" value="${w.date || ""}"></td>
            <td><select class="edit-time">${buildTimeOptions(w.time || "")}</select></td>
            <td>
              <select class="edit-type">
                <option value="walk"${w.type === "walk" ? " selected" : ""}>walk</option>
                <option value="run"${w.type === "run" ? " selected" : ""}>run</option>
                <option value="swim"${w.type === "swim" ? " selected" : ""}>swim</option>
                <option value="bike"${w.type === "bike" ? " selected" : ""}>bike</option>
                <option value="other"${w.type === "other" ? " selected" : ""}>other</option>
              </select>
            </td>
            <td><input type="number" class="edit-distance" step="0.01" min="0" value="${w.distance != null ? w.distance : ""}"></td>
            <td><input type="number" class="edit-pace" step="0.01" min="0" value="${w.pace != null ? w.pace : ""}"></td>
            <td><input type="number" class="edit-temp" step="0.1" value="${w.temp != null ? w.temp : ""}"></td>
            <td><input type="text" class="edit-weather" value="${w.weather || ""}"></td>
            <td><textarea class="edit-comments" rows="1">${w.comments || ""}</textarea></td>
            <td class="actions">
              <button type="button" class="btn-save save-edit" data-id="${w.id}">Save</button>
              <button type="button" class="btn-cancel cancel-edit" data-id="${w.id}">Cancel</button>
            </td>
          </tr>
        `;
      } else {
        // Read-only row
        html += `
          <tr data-id="${w.id}">
            <td>${w.date || ""}</td>
            <td>${formatTimeDisplay(w.time)}</td>
            <td>${w.type || ""}</td>
            <td>${w.distance != null ? w.distance : ""}</td>
            <td>${w.pace != null ? w.pace : ""}</td>
            <td>${w.temp != null ? w.temp : ""}</td>
            <td>${w.weather || ""}</td>
            <td>${w.comments || ""}</td>
            <td class="actions">
              <button type="button" class="btn-edit edit-btn" data-id="${w.id}">Edit</button>
              <button type="button" class="btn-delete delete-btn" data-id="${w.id}">Delete</button>
            </td>
          </tr>
        `;
      }
    });
  }

  tbody.innerHTML = html;

  // Attach listeners for new row
  document.getElementById("save-new").addEventListener("click", saveNewWorkout);
  document.getElementById("cancel-new").addEventListener("click", clearNewRow);

  // Attach listeners for existing rows
  tbody.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingId = btn.dataset.id;
      renderTable();
    });
  });
  tbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteWorkout(btn.dataset.id));
  });
  tbody.querySelectorAll(".save-edit").forEach((btn) => {
    btn.addEventListener("click", () => saveEdit(btn.dataset.id));
  });
  tbody.querySelectorAll(".cancel-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingId = null;
      renderTable();
    });
  });
}

function formatTimeDisplay(time) {
  if (!time) return "";
  const [hStr, m] = time.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function saveNewWorkout() {
  const date = document.getElementById("new-date").value;
  const time = document.getElementById("new-time").value;
  const type = document.getElementById("new-type").value;
  const distance = document.getElementById("new-distance").value;
  const pace = document.getElementById("new-pace").value;
  const temp = document.getElementById("new-temp").value;
  const weather = document.getElementById("new-weather").value.trim();
  const comments = document.getElementById("new-comments").value.trim();

  if (!date || !type) {
    alert("Date and workout type are required.");
    return;
  }

  const workout = {
    id: generateId(),
    date,
    time: time || "",
    type,
    distance: distance !== "" ? parseFloat(distance) : null,
    pace: pace !== "" ? parseFloat(pace) : null,
    temp: temp !== "" ? parseFloat(temp) : null,
    weather,
    comments
  };

  workouts.unshift(workout); // add to front
  sortWorkouts();
  saveWorkouts();
  editingId = null;
  renderTable();
  clearNewRow();
}

function saveEdit(id) {
  const row = tbody.querySelector(`tr[data-id="${id}"]`);
  if (!row) return;

  const date = row.querySelector(".edit-date").value;
  const time = row.querySelector(".edit-time").value;
  const type = row.querySelector(".edit-type").value;
  const distance = row.querySelector(".edit-distance").value;
  const pace = row.querySelector(".edit-pace").value;
  const temp = row.querySelector(".edit-temp").value;
  const weather = row.querySelector(".edit-weather").value.trim();
  const comments = row.querySelector(".edit-comments").value.trim();

  if (!date || !type) {
    alert("Date and workout type are required.");
    return;
  }

  const idx = workouts.findIndex((w) => w.id === id);
  if (idx === -1) return;

  workouts[idx] = {
    id,
    date,
    time: time || "",
    type,
    distance: distance !== "" ? parseFloat(distance) : null,
    pace: pace !== "" ? parseFloat(pace) : null,
    temp: temp !== "" ? parseFloat(temp) : null,
    weather,
    comments
  };

  sortWorkouts();
  saveWorkouts();
  editingId = null;
  renderTable();
}

function deleteWorkout(id) {
  if (!confirm("Delete this workout?")) return;
  workouts = workouts.filter((w) => w.id !== id);
  saveWorkouts();
  if (editingId === id) editingId = null;
  renderTable();
}

// Init
loadWorkouts();