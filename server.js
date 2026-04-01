const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "tasks.db");
const db = new sqlite3.Database(dbPath);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function isValidDueDateInRange(dueDate) {
  if (!dueDate) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return false;

  const target = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1);

  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 3);

  return target >= minDate && target <= maxDate;
}

async function initDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `;

  await run(createTableSQL);
}

app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await all(
      `SELECT id, title, description, completed, due_date, created_at, updated_at
       FROM tasks
       ORDER BY id DESC`
    );
    res.json(tasks.map((task) => ({ ...task, completed: Boolean(task.completed) })));
  } catch (error) {
    res.status(500).json({ error: "Failed to get tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { title, description = "", dueDate = null } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  if (!isValidDueDateInRange(dueDate)) {
    res.status(400).json({ error: "dueDate must be within tomorrow and 3 years from today" });
    return;
  }

  try {
    const result = await run(
      `INSERT INTO tasks (title, description, due_date, completed, created_at, updated_at)
       VALUES (?, ?, ?, 0, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
      [title.trim(), String(description || ""), dueDate]
    );

    const inserted = await all(
      `SELECT id, title, description, completed, due_date, created_at, updated_at
       FROM tasks
       WHERE id = ?`,
      [result.id]
    );

    const task = inserted[0];
    res.status(201).json({ ...task, completed: Boolean(task.completed) });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.patch("/api/tasks/:id/status", async (req, res) => {
  const taskId = Number(req.params.id);
  const { completed } = req.body;

  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "completed must be a boolean" });
    return;
  }

  try {
    const result = await run(
      `UPDATE tasks
       SET completed = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      [completed ? 1 : 0, taskId]
    );

    if (result.changes === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const updated = await all(
      `SELECT id, title, description, completed, due_date, created_at, updated_at
       FROM tasks
       WHERE id = ?`,
      [taskId]
    );

    const task = updated[0];
    res.json({ ...task, completed: Boolean(task.completed) });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task status" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  try {
    const result = await run("DELETE FROM tasks WHERE id = ?", [taskId]);
    if (result.changes === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: "Unexpected server error" });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
