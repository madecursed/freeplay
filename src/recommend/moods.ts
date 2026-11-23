/** Настроения и тематические миксы → теги для поиска в каталогах. */
export interface Mood { id: string; label: string; icon: string; tags: string[] }

export const MOODS: Mood[] = [
  { id: 'sad', label: 'Грустное', icon: 'sad', tags: ['sad', 'melancholic', 'emotional'] },
  { id: 'calm', label: 'Спокойное', icon: 'calm', tags: ['chill', 'ambient', 'lofi'] },
  { id: 'anxious', label: 'Тревожное', icon: 'anxious', tags: ['dark', 'darkwave', 'industrial'] },
  { id: 'romantic', label: 'Романтичное', icon: 'heart', tags: ['romantic', 'love', 'rnb'] },
  { id: 'angry', label: 'Агрессивное', icon: 'fire', tags: ['phonk', 'metal', 'hardstyle'] },
  { id: 'happy', label: 'Счастливое', icon: 'happy', tags: ['happy', 'upbeat', 'dance'] },
];

export interface Mix { id: string; title: string; subtitle: string; tags: string[]; hue: number }

/** Карточки «Рекомендации» на главной. */
export const MIXES: Mix[] = [
  { id: 'lost-sleep', title: 'Потерянный', subtitle: 'сон', tags: ['ambient', 'sleep', 'dreamy'], hue: 265 },
  { id: 'autumn', title: 'Вечная', subtitle: 'осень', tags: ['indie', 'melancholic', 'post-punk'], hue: 285 },
  { id: 'psy', title: 'Психоделия', subtitle: '2000-х', tags: ['psychedelic', 'trip-hop', 'shoegaze'], hue: 300 },
  { id: 'night-drive', title: 'Ночная', subtitle: 'трасса', tags: ['synthwave', 'phonk', 'night'], hue: 250 },
  { id: 'dream', title: 'Сны', subtitle: 'наяву', tags: ['dream pop', 'shoegaze', 'ethereal'], hue: 275 },
];
