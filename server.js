
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const HOST = '127.0.0.1';
const PORT = 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected'
    });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch tasks failed:', error.message);
    res.status(500).json({ error: 'Could not fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, description } = req.body;

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: 'A task title is required'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title.trim(), description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task failed:', error.message);
    res.status(500).json({ error: 'Could not create task' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  if (typeof req.body.completed !== 'boolean') {
    return res.status(400).json({
      error: 'completed must be true or false'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks SET completed = $1
       WHERE id = $2 RETURNING *`,
      [req.body.completed, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task failed:', error.message);
    res.status(500).json({ error: 'Could not update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted', id });
  } catch (error) {
    console.error('Delete task failed:', error.message);
    res.status(500).json({ error: 'Could not delete task' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});

