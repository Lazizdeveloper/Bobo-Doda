-- Seed default categories if they do not exist
INSERT INTO "categories" ("id", "slug", "nameUz", "nameRu", "nameEn", "status", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('01a092fb-037e-740b-9b72-83002432b73c', 'dizayn', 'Dizayn', 'Дизайн', 'Design', 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b73d', 'dasturlash', 'Dasturlash', 'Программирование', 'Development', 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b73e', 'tarjima', 'Tarjima', 'Перевод', 'Translation', 'ACTIVE', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b73f', 'kontent', 'Matn va kontent', 'Тексты и контент', 'Content Writing', 'ACTIVE', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b740', 'marketing', 'Marketing', 'Маркетинг', 'Marketing', 'ACTIVE', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b741', 'video', 'Video va animatsiya', 'Видео и анимация', 'Video & Animation', 'ACTIVE', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b742', 'audio', 'Audio va musiqa', 'Аудио и музыка', 'Audio & Music', 'ACTIVE', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('01a092fb-037e-740b-9b72-83002432b743', 'biznes', 'Biznes va boshqaruv', 'Бизнес и управление', 'Business & Consulting', 'ACTIVE', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
