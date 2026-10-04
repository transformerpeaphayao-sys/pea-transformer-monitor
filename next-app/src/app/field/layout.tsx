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
  return (
    <div className="flex-1 h-full max-h-full w-full overflow-hidden flex flex-col min-h-0 overscroll-none select-none">
      {children}
    </div>
  );
}
