-- Миграция для добавления поля reply_to_message_id в таблицу messages
-- Это поле позволит создавать ответы на сообщения в чатах

-- Добавляем поле reply_to_message_id
ALTER TABLE messages 
ADD COLUMN reply_to_message_id INTEGER;

-- Добавляем внешний ключ для связи с исходным сообщением
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_reply_to_message 
FOREIGN KEY (reply_to_message_id) 
REFERENCES messages(id) 
ON DELETE SET NULL;

-- Добавляем индекс для быстрого поиска ответов на сообщение
CREATE INDEX idx_messages_reply_to_message_id 
ON messages(reply_to_message_id) 
WHERE reply_to_message_id IS NOT NULL;

-- Добавляем комментарии к полю
COMMENT ON COLUMN messages.reply_to_message_id IS 'ID сообщения, на которое отвечаем (NULL если не ответ)';
