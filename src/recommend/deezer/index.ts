/**
 * Рекомендации на основе Deezer (отдельный модуль).
 * Deezer знает, какие исполнители похожи друг на друга (по прослушиваниям миллионов людей),
 * а играет музыка по-прежнему через SoundCloud. Подробно — docs/RECOMMENDATIONS.md, раздел «Deezer».
 */
export { similarFor, type SimilarArtist } from './similar';
export { findScProfile, normName } from './match';
export { findArtist, relatedArtists } from './api';
