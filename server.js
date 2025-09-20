const express = require('express');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// ✅ 認証情報の読み込み
const TOKEN_PATH = 'token.json';
const credentials = JSON.parse(process.env.GOOGLE_TOKEN_JSON);

// ✅ デスクトップアプリ用のクライアント情報（富雄さんの新しいIDとシークレットに置き換えてください）
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);


// ✅ トークンをセット
oAuth2Client.setCredentials(credentials);

// ✅ 予定追加
app.post('/add-event', async (req, res) => {
  const { title, date, startTime, endTime, isAllDay } = req.body;
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const start = isAllDay
    ? { date }
    : {
        dateTime: `${date}T${startTime}:00+09:00`,
        timeZone: 'Asia/Tokyo'
      };

  const end = isAllDay
    ? { date }
    : {
        dateTime: `${date}T${endTime}:00+09:00`,
        timeZone: 'Asia/Tokyo'
      };

  const event = { summary: title, start, end };

  try {
    await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    res.json({ message: '予定を追加しました。' });
  } catch (error) {
    console.error('追加エラー:', error);
    res.status(500).json({ message: '予定の追加に失敗しました。' });
  }
});

app.post('/get-events-range', async (req, res) => {
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const { startDate, endDate } = req.body;
  const timeMin = new Date(startDate);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(endDate);
  timeMax.setHours(23, 59, 59, 999);

  try {
    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'Asia/Tokyo'
    });

    const events = eventsRes.data.items.map(e => ({
      title: e.summary,
      start: e.start.dateTime || e.start.date,
      end: e.end?.dateTime || e.end?.date
    }));

    res.json({ events });
  } catch (err) {
    console.error('取得エラー:', err);
    res.json({ events: [] });
  }
});



app.listen(PORT, () => {
  console.log(`✅ サーバー起動中: http://localhost:${PORT}`);
});
