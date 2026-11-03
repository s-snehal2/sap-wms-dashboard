CREATE TYPE "user_role" AS ENUM('admin', 'hod', 'user');--> statement-breakpoint
CREATE SEQUENCE "public"."note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."project_pid_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY DEFAULT 'N' || lpad(nextval('note_id_seq')::text, 3, '0'),
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"cat" text DEFAULT 'idea' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"date" date DEFAULT current_date NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"proj_pid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pins" (
	"owner_id" uuid DEFAULT auth.uid(),
	"pid" text,
	"priority" text DEFAULT 'high' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"remind" text DEFAULT 'weekly' NOT NULL,
	"added_at" date DEFAULT current_date NOT NULL,
	CONSTRAINT "pins_pkey" PRIMARY KEY("owner_id","pid")
);
--> statement-breakpoint
ALTER TABLE "pins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"full_name" text,
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL,
	"hod_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_hod_not_self" CHECK ("hod_id" is null or "hod_id" <> "id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"pid" text PRIMARY KEY DEFAULT 'CMC' || lpad(nextval('project_pid_seq')::text, 4, '0'),
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"sr" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"plant" text DEFAULT '' NOT NULL,
	"sys" text DEFAULT '' NOT NULL,
	"mod" text DEFAULT '' NOT NULL,
	"phase" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"pct" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"quarter" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_pct_range" CHECK ("pct" >= 0 and "pct" <= 100)
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "remarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pid" text NOT NULL,
	"author_id" uuid DEFAULT auth.uid() NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "notes_owner_id_idx" ON "notes" ("owner_id");--> statement-breakpoint
CREATE INDEX "notes_proj_pid_idx" ON "notes" ("proj_pid");--> statement-breakpoint
CREATE INDEX "pins_pid_idx" ON "pins" ("pid");--> statement-breakpoint
CREATE INDEX "profiles_hod_id_idx" ON "profiles" ("hod_id");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" ("role");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" ("status");--> statement-breakpoint
CREATE INDEX "projects_quarter_idx" ON "projects" ("quarter");--> statement-breakpoint
CREATE INDEX "remarks_pid_idx" ON "remarks" ("pid");--> statement-breakpoint
CREATE INDEX "remarks_author_id_idx" ON "remarks" ("author_id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_profiles_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_proj_pid_projects_pid_fkey" FOREIGN KEY ("proj_pid") REFERENCES "projects"("pid") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_owner_id_profiles_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_pid_projects_pid_fkey" FOREIGN KEY ("pid") REFERENCES "projects"("pid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_hod_id_profiles_id_fkey" FOREIGN KEY ("hod_id") REFERENCES "profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_profiles_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_pid_projects_pid_fkey" FOREIGN KEY ("pid") REFERENCES "projects"("pid") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_author_id_profiles_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE;