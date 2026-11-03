ALTER TABLE "profiles" ADD COLUMN "emp_code" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_emp_code_key" UNIQUE("emp_code");