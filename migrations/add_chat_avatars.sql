-- Создание таблицы для аватарок чатов
CREATE TABLE IF NOT EXISTS "chat_avatars" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"image_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Добавление столбца has_avatar в таблицу chats
ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "has_avatar" boolean DEFAULT false;

-- Добавление столбца updated_at в таблицу chats
ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Создание индекса для быстрого поиска аватарок по chat_id
CREATE INDEX IF NOT EXISTS "chat_avatars_chat_id_idx" ON "chat_avatars" ("chat_id");

-- Добавление внешнего ключа (если нужно)
-- ALTER TABLE "chat_avatars" ADD CONSTRAINT "chat_avatars_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE cascade;
