import * as React from 'react';
import { cn } from 'cn';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        CLASE_CAMPO,
        'file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
