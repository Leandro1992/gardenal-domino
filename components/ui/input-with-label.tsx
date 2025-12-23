import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface InputWithLabelProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
}

export const InputWithLabel = React.forwardRef<HTMLInputElement, InputWithLabelProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={inputId} className={error ? 'text-destructive' : ''}>
            {label}
          </Label>
        )}
        <Input
          id={inputId}
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

InputWithLabel.displayName = 'InputWithLabel';

