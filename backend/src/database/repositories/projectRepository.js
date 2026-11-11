import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';

export const projectRepository = {
  list() {
    return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  },

  create({ name, description }) {
    const project = {
      id: uuidv4(),
      name,
      description: description || '',
    };

    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (@id, @name, @description, datetime('now'), datetime('now'))
    `).run(project);

    return project;
  },

  update(id, fields) {
    const updates = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    if (!updates) {
      return this.getById(id);
    }

    db.prepare(`
      UPDATE projects SET ${updates}, updated_at = datetime('now') WHERE id = @id
    `).run({ id, ...fields });

    return this.getById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  },
};
