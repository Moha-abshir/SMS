import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const admissionSchema = z.object({
  parent: z.object({
    fullName: z.string().min(2, 'Parent full name is required'),
    phoneNumber: z.string().min(10, 'Valid phone number is required'),
    idNumber: z.string().min(5, 'National ID number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
  }),
  student: z.object({
    firstName: z.string().min(2, 'First name is required'),
    middleName: z.string().optional(),
    lastName: z.string().min(2, 'Last name is required'),
    gender: z.enum(['MALE', 'FEMALE']),
    assessmentNumber: z.string().optional(),
    previousGrade: z.string().optional(),
    classId: z.string().uuid('Please select a valid class'),
    admissionDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid admission date' }),
  }),
});

export const catScoreSchema = z.object({
  studentId: z.string().uuid(),
  marksObtained: z.number().min(0).max(100),
  maxMarks: z.number().default(100),
  remarks: z.string().optional(),
});

export const examScoreSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  marksObtained: z.number().min(0).max(100),
  maxMarks: z.number().default(100),
  teacherRemarks: z.string().optional(),
});

export const feePaymentSchema = z.object({
  studentId: z.string().uuid(),
  billId: z.string().uuid(),
  amountPaid: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'MANUAL_MPESA', 'MPESA_STK_PUSH', 'BANK_DEPOSIT']),
  mpesaRefCode: z.string().optional(),
  bankRefNumber: z.string().optional(),
  paidBy: z.string().min(2, 'Payer name is required'),
});

export const expenseSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Expense amount must be positive'),
  vendorName: z.string().optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  expenseDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
});
