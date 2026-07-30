CREATE TYPE "public"."exam_status" AS ENUM('DRAFT', 'MARKS_ENTRY', 'PENDING_DEPUTY_APPROVAL', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."unlock_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."level_category" AS ENUM('PRIMARY', 'JUNIOR', 'PPE');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('ACTIVE', 'TRANSFERRED', 'EXPELLED', 'GRADUATED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');--> statement-breakpoint
CREATE TYPE "public"."sms_status" AS ENUM('SENT', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'MANUAL_MPESA', 'MPESA_STK_PUSH', 'BANK_DEPOSIT');--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"term_number" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"cat_number" integer NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"marks_obtained" numeric(5, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"remarks" text
);l
--> statement-breakpoint
CREATE TABLE "exam_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"marks_obtained" numeric(5, 2) NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"cbc_rubric_level" varchar(10),
	"junior_points" integer,
	"teacher_remarks" text,
	"entered_by_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"status" "exam_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_card_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_by_id" uuid,
	"locked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "report_unlock_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"approved_by_id" uuid,
	"status" "unlock_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"level_category" "level_category" NOT NULL,
	"numeric_order" integer NOT NULL,
	"class_teacher_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"id_number" varchar(50) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "guardians_id_number_unique" UNIQUE("id_number")
);
--> statement-breakpoint
CREATE TABLE "secondary_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admission_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"gender" varchar(10) NOT NULL,
	"assessment_number" varchar(50),
	"previous_grade" varchar(50),
	"class_id" uuid NOT NULL,
	"primary_guardian_id" uuid NOT NULL,
	"admission_date" date NOT NULL,
	"status" "student_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "students_admission_number_unique" UNIQUE("admission_number")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"level_category" "level_category" NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "teacher_subject_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"academic_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "absence_sms_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"consecutive_absences" integer NOT NULL,
	"sms_message" text NOT NULL,
	"status" "sms_status" DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"register_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "attendance_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"taken_by_id" uuid NOT NULL,
	"is_submitted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_name" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"user_identifier" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_name" varchar(250) NOT NULL,
	"school_motto" varchar(250),
	"contact_phone" varchar(50),
	"contact_email" varchar(100),
	"logo_url" text,
	"absence_sms_threshold" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_number" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"vendor_name" varchar(100),
	"receipt_url" text,
	"approved_by_id" uuid,
	"recorded_by_id" uuid NOT NULL,
	"expense_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_voucher_number_unique" UNIQUE("voucher_number")
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"student_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"amount_paid" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"mpesa_ref_code" varchar(50),
	"bank_ref_number" varchar(50),
	"paid_by" varchar(100) NOT NULL,
	"recorded_by_id" uuid NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fee_payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "fee_structure_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"level_category" "level_category" NOT NULL,
	"class_id" uuid NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"billed_amount" numeric(10, 2) NOT NULL,
	"waiver_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"balance" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"date_of_employment" timestamp,
	"salary_amount" numeric(10, 2),
	"role_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"two_factor_otp" varchar(10),
	"two_factor_expires_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cat_assessments" ADD CONSTRAINT "cat_assessments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_assessments" ADD CONSTRAINT "cat_assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_assessments" ADD CONSTRAINT "cat_assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_assessments" ADD CONSTRAINT "cat_assessments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_scores" ADD CONSTRAINT "cat_scores_cat_id_cat_assessments_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cat_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_scores" ADD CONSTRAINT "cat_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_exam_id_examinations_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."examinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_scores" ADD CONSTRAINT "exam_scores_entered_by_id_users_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_locks" ADD CONSTRAINT "report_card_locks_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_locks" ADD CONSTRAINT "report_card_locks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_card_locks" ADD CONSTRAINT "report_card_locks_locked_by_id_users_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_unlock_requests" ADD CONSTRAINT "report_unlock_requests_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_unlock_requests" ADD CONSTRAINT "report_unlock_requests_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_unlock_requests" ADD CONSTRAINT "report_unlock_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_unlock_requests" ADD CONSTRAINT "report_unlock_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_class_teacher_id_users_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secondary_guardians" ADD CONSTRAINT "secondary_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secondary_guardians" ADD CONSTRAINT "secondary_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_primary_guardian_id_guardians_id_fk" FOREIGN KEY ("primary_guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_allocations" ADD CONSTRAINT "teacher_subject_allocations_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_allocations" ADD CONSTRAINT "teacher_subject_allocations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_allocations" ADD CONSTRAINT "teacher_subject_allocations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_sms_logs" ADD CONSTRAINT "absence_sms_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_sms_logs" ADD CONSTRAINT "absence_sms_logs_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_register_id_attendance_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."attendance_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_registers" ADD CONSTRAINT "attendance_registers_taken_by_id_users_id_fk" FOREIGN KEY ("taken_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_bill_id_student_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."student_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structure_items" ADD CONSTRAINT "fee_structure_items_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_bills" ADD CONSTRAINT "student_bills_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_bills" ADD CONSTRAINT "student_bills_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;