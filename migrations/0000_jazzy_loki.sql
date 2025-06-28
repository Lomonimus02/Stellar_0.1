CREATE TABLE "academic_period_boundaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"period_key" text NOT NULL,
	"period_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"academic_year" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"assignment_type" text NOT NULL,
	"max_score" numeric NOT NULL,
	"teacher_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"subgroup_id" integer,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"planned_for" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "chat_avatars" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"image_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"is_admin" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_message_id" integer
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"type" text NOT NULL,
	"creator_id" integer NOT NULL,
	"school_id" integer NOT NULL,
	"has_avatar" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_academic_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"period_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"slot_number" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"school_id" integer NOT NULL,
	"grade_level" integer NOT NULL,
	"academic_year" text NOT NULL,
	"grading_system" text DEFAULT 'five_point' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cumulative_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"score" numeric NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"uploader_id" integer NOT NULL,
	"school_id" integer,
	"class_id" integer,
	"subject_id" integer,
	"is_encrypted" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"schedule_id" integer,
	"assignment_id" integer,
	"subgroup_id" integer,
	"grade" integer NOT NULL,
	"comment" text,
	"grade_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"subject_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"schedule_id" integer,
	"due_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"homework_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"submission_text" text,
	"file_url" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"grade" integer,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text,
	"has_attachment" boolean DEFAULT false NOT NULL,
	"attachment_type" text,
	"attachment_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_e2e_encrypted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer NOT NULL,
	"student_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"schedule_date" date,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"room" text,
	"status" text DEFAULT 'not_conducted',
	"subgroup_id" integer
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	CONSTRAINT "student_classes_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "student_subgroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"subgroup_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subgroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"class_id" integer NOT NULL,
	"school_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"school_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"subject_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_number" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"school_id" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"school_id" integer,
	"class_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"active_role" text,
	"school_id" integer,
	"public_key" text,
	"private_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
