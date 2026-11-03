ALTER TABLE "notes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pins" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "remarks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "owner_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "owner_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "owner_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "remarks" ALTER COLUMN "author_id" DROP DEFAULT;
