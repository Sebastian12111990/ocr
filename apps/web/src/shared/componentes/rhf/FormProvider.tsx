 

import { FormEventHandler, ReactNode } from 'react';
import { FieldValues, Path, FormProvider as RHFProvider, UseFormReturn } from 'react-hook-form';

interface Props<TFieldValues extends FieldValues> {
  children: ReactNode;
  methods: UseFormReturn<TFieldValues>;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

export function FormProvider<TFieldValues extends FieldValues>({ 
    children, 
    onSubmit, 
    methods 
  }: Props<TFieldValues>) {
  return (
    <RHFProvider {...methods}>
      {onSubmit ? (
        <form noValidate onSubmit={onSubmit}>
          {children}
        </form>
      ) : (
        children
      )}
    </RHFProvider>
  );
}

 
 