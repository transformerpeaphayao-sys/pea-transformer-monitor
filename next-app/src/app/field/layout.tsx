import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ระบบบันทึกผลภาคสนาม | PEA Smart Utility',
  description: 'ระบบบันทึกและตรวจสอบโหลดหม้อแปลงไฟฟ้าภาคสนาม กฟภ. พะเยา',
  manifest: '/manifest-field.json',
};

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
