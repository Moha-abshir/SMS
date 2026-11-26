import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { FinanceController } from './finance.controller.js';

const router = Router();

router.use(authenticate);

// Financial summary
router.get('/summary', authorizePermission('finance:view'), FinanceController.getFinancialSummary);

router.get('/billing-preview', authorizePermission('finance:view'), FinanceController.previewBilling);
router.post('/billing', authorizePermission('finance:bill'), FinanceController.generateBills);

router.get('/learners', authorizePermission('finance:view'), async (req,res) => {
  try {
    const { db } = await import('../../config/db.js');
    const { sql } = await import('@school/shared');
    const {z} = await import('zod');
    const search=z.string().trim().min(2).max(100).parse(req.query.search);
    const pattern=`%${search.replace(/[\\%_]/g,'\\$&')}%`;
    const data = await db.execute(sql`SELECT json_build_object('id',s.id,'firstName',s.first_name,'middleName',s.middle_name,'lastName',s.last_name,'assessmentNumber',s.assessment_number,'status',s.status) student,
      json_build_object('fullName',g.full_name) guardian,json_build_object('name',c.name) class
      FROM students s JOIN guardians g ON g.id=s.primary_guardian_id JOIN classes c ON c.id=s.class_id
      WHERE ((s.deleted_at IS NULL AND s.status='ACTIVE') OR EXISTS(SELECT 1 FROM student_bills b WHERE b.student_id=s.id AND b.deleted_at IS NULL))
      AND (concat_ws(' ',s.first_name,s.middle_name,s.last_name) ILIKE ${pattern} OR s.assessment_number ILIKE ${pattern})
      ORDER BY s.first_name,s.last_name,s.id LIMIT 25`);
    res.json({success:true,data});
  } catch {res.status(500).json({success:false,message:'Could not load finance learners.'});}
});

router.get('/receipts/:paymentId' , authorizePermission('finance:view'), async (req,res) => {
  try {
    const { z } = await import('zod');
    const { FinanceService } = await import('./finance.service.js');
    const data = await FinanceService.getReceipt(z.uuid().parse(req.params.paymentId));
    res.json({success:true,data});
  } catch { res.status(400).json({success:false,message:'Could not load this receipt.'}); }
});

// Fee payments
router.get('/payments', authorizePermission('finance:view'), FinanceController.getPayments);
router.post('/payments', authorizePermission('finance:record_payment'), FinanceController.recordPayment);

router.get('/reconciliation', authorizePermission('finance:view'), FinanceController.reconciliation);
router.get('/reversals/history', authorizePermission('finance:view'), FinanceController.reversalHistory);

// Payment reversals queue
router.get('/reversals/pending', authorizePermission('finance:view'), FinanceController.getPendingReversals);
router.post('/reversals', authorizePermission('finance:record_payment'), FinanceController.requestReversal);
router.put('/reversals/:id/approve', authorizePermission('finance:reversal_approve'), FinanceController.approveReversal);
router.put('/reversals/:id/reject', authorizePermission('finance:reversal_approve'), FinanceController.rejectReversal);

// Student statement
router.get('/students/:studentId/statement', authorizePermission('finance:view'), FinanceController.getStudentStatement);

export default router;
