-- Миграция для добавления уникального ограничения на studentId в таблице student_classes
-- Это обеспечит, что студент может состоять только в одном классе одновременно

-- Сначала удаляем дублирующиеся записи, оставляя только последнюю для каждого студента
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY id DESC) as rn
  FROM student_classes
)
DELETE FROM student_classes 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Добавляем уникальное ограничение на student_id
ALTER TABLE student_classes 
ADD CONSTRAINT unique_student_class 
UNIQUE (student_id);

-- Добавляем комментарий к таблице
COMMENT ON TABLE student_classes IS 'Связь студентов с классами. Каждый студент может состоять только в одном классе одновременно.';
COMMENT ON COLUMN student_classes.student_id IS 'ID студента (уникальный - студент может быть только в одном классе)';
COMMENT ON COLUMN student_classes.class_id IS 'ID класса, в котором состоит студент';
