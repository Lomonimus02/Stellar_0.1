-- Добавляем поле reply_to_message_id в таблицу messages
ALTER TABLE messages ADD COLUMN reply_to_message_id INTEGER;

-- Добавляем внешний ключ для связи с другими сообщениями
ALTER TABLE messages ADD CONSTRAINT fk_reply_to_message 
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Добавляем индекс для быстрого поиска ответов
CREATE INDEX idx_messages_reply_to_message_id ON messages(reply_to_message_id);
