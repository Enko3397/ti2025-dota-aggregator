// server.js — минимальный агрегатор Stratz + Liquipedia
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const cache = new NodeCache({ stdTTL: 60 * 5 }); // кэш 5 минут

// STRATZ API KEY
const STRATZ_API_KEY = process.env.STRATZ_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJTdWJqZWN0IjoiN2I4ZDJhYmUtMjBjZC00MzUzLWJkMmQtZWY1M2Q0M2YyMzQ3IiwiU3RlYW1JZCI6IjE1MzIxMDE5MDUiLCJBUElVc2VyIjoidHJ1ZSIsIm5iZiI6MTc1NzIyODE0NiwiZXhwIjoxNzg4NzY0MTQ2LCJpYXQiOjE3NTcyMjgxNDYsImlzcyI6Imh0dHBzOi8vYXBpLnN0cmF0ei5jb20ifQ.U8qy484YjG3FIJxfonY1AlOhhdRApQcIvCF8oTRNNA0';

// Получение игрока Stratz
async function fetchStratzPlayer(name) {
  try {
    const url = `https://api.stratz.com/api/v1/Player?name=${encodeURIComponent(name)}`;
    const r = await axios.get(url, { headers: { 'Authorization': `Bearer ${STRATZ_API_KEY}` } });
    return r.data;
  } catch (e) {
    console.error('Stratz error:', e.message);
    return null;
  }
}

// Получение страницы Liquipedia через MediaWiki API
async function fetchLiquipediaPage(title) {
  try {
    const apiUrl = 'https://liquipedia.net/dota2/api.php';
    const params = {
      action: 'query',
      format: 'json',
      prop: 'revisions|pageprops',
      rvprop: 'content',
      titles: title
    };
    const r = await axios.get(apiUrl, { params });
    return r.data;
  } catch (e) {
    console.error('Liquipedia error:', e.message);
    return null;
  }
}

// Основной агрегатор
async function aggregatePlayer(name) {
  const key = `player:${name}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const [stratz, liquipedia] = await Promise.all([
    fetchStratzPlayer(name),
    fetchLiquipediaPage(name)
  ]);

  const result = {
    query: name,
    sources: {},
    combined: {}
  };

  if (stratz) result.sources.stratz = stratz;
  if (liquipedia) result.sources.liquipedia = liquipedia;

  // Stratz: добавляем основные поля в combined
  if (stratz) {
    result.combined.name = stratz.name || name;
    result.combined.avatar = stratz.avatarUrl;
    result.combined.stratz = stratz;
  }

  // Liquipedia: парсим роль и команду (пример)
  try {
    if (liquipedia && liquipedia.query) {
      const pages = liquipedia.query.pages;
      const pageKey = Object.keys(pages)[0];
      const content = pages[pageKey].revisions && pages[pageKey].revisions[0]['*'];
      if (content) {
        const roleMatch = content.match(/\|role\s*=\s*([^\n\r]+)/i);
        if (roleMatch) result.combined.role = roleMatch[1].trim();
      }
    }
  } catch (e) {}

  cache.set(key, result);
  return result;
}

// API endpoint
app.get('/api/aggregate', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q parameter required' });

  try {
    const data = await aggregatePlayer(q);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
