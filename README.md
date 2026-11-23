# Nocturne

Музыкальный плеер без рекламы: стриминг из легальных бесплатных каталогов (Audius, Jamendo, SoundCloud API) и собственные рекомендации. Работает как PWA, ставится на iPhone без App Store и без Mac.

## Установка на iPhone
1. Откройте адрес сайта (GitHub Pages) в **Safari**.
2. «Поделиться» → «На экран Домой».
3. Запускайте с иконки: фоновое воспроизведение и управление с экрана блокировки работают (iOS 16.4+).

## Запуск локально
```bash
npm install
cp .env.example .env   # заполнить ключи (необязательно — Audius работает без ключа)
npm run dev            # откройте адрес Network с телефона в той же Wi-Fi сети
```

## Источники
| Источник | Ключ | Что даёт |
|---|---|---|
| Audius | не нужен | полный стриминг, тренды, много новых релизов |
| Jamendo | `VITE_JAMENDO_CLIENT_ID` (бесплатно, devportal.jamendo.com) | 600k+ треков CC, жанры/теги/настроение |
| SoundCloud | прокси `VITE_SOUNDCLOUD_PROXY` | новые треки независимых артистов; лейбловые треки (30-сек превью) отфильтрованы |

**SoundCloud:** зарегистрировать приложение на soundcloud.com/you/apps → развернуть `worker/soundcloud-proxy.js` на Cloudflare Workers (бесплатно) с переменными `SC_CLIENT_ID`, `SC_CLIENT_SECRET` → адрес воркера в `VITE_SOUNDCLOUD_PROXY`. Условие SoundCloud — указывать автора и ссылку на трек (есть в полноэкранном плеере).

## Публикация
`npm run deploy` — собирает проект (с ключами из `.env`) и пушит в ветку `gh-pages`. Сайт: https://madecursed.github.io/freeplay/

## Структура
```
src/
  types.ts            Track и интерфейс MusicSource
  sources/            адаптеры каталогов + fromAll() — параллельный опрос с чередованием
  player/player.ts    очередь, фон, Media Session (экран блокировки), автомикс
  recommend/
    profile.ts        профиль вкуса: веса артистов/жанров/тегов с затуханием
    recommend.ts      кандидаты → ранжирование → разнообразие
  storage/store.ts    лайки, история, дизлайки (localStorage)
  ui/
    App.tsx           каркас: фон, экран, мини-плеер, таб-бар
    navigation.ts     вкладки + стек страниц + плеер + шторка
    screens/          SplashScreen, HomeScreen, SearchScreen, LibraryScreen,
                      PlaylistScreen, PlayerScreen, MoodScreen, ProfileScreen
    components/       Icon, Cover, SceneArt, TrackList, MiniPlayer, TabBar,
                      TrackSheet, SourceChips, SourceNotice, Nebula
  recommend/moods.ts  настроения и тематические миксы → теги
  storage/settings.ts выбор источников (SoundCloud — основной), имя, прокси
worker/               прокси для SoundCloud (Cloudflare Worker)
scripts/deploy.mjs    публикация на GitHub Pages (npm run deploy)
```

## Как работают рекомендации
1. **Сигналы:** дослушал +1, лайк +3, пропуск в первые 30 с −1, «не нравится» −4. Каждый сигнал меняет веса признаков трека (артист, жанр, теги).
2. **Затухание:** вес вдвое ослабевает за 30 дней — профиль следует за меняющимся вкусом.
3. **Кандидаты:** тренды + поиск по топ-жанрам и топ-тегам во всех источниках.
4. **Ранжирование:** сходство с профилем + случайная «новизна» − штраф за недавно слушанное.
5. **Разнообразие:** не больше 2 треков одного артиста в выдаче.
6. **Автомикс:** когда в очереди ≤3 трека, она дополняется рекомендациями.

## Дорожная карта
- [x] Плейлисты, настроения, выбор источников, дизайн Nocturne
- [ ] Тексты песен (lrclib.net)
- [ ] Эквалайзер (Web Audio)
- [ ] Очередь с перетаскиванием
- [ ] IndexedDB вместо localStorage, экспорт/импорт профиля
- [ ] Офлайн-кэш избранного (Cache API)
- [ ] «Похожие на этот трек» (поиск по тегам текущего трека)
- [ ] Время суток/день недели как признак (утро — спокойное, вечер — энергичное)
- [ ] Свой бэкенд: коллаборативная фильтрация (кто слушал X, слушал Y)
- [ ] Анализ аудио (BPM, энергия) через Web Audio API
- [ ] Обёртка в нативное приложение через Capacitor (нужен Apple Developer)

Каждое улучшение — отдельная ветка: `git checkout -b feature/playlists`.
