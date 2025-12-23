import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const Icon = icons[type];

  return (
    <div className={cn('rounded-lg border p-4', styles[type], className)}>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
