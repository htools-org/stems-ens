import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function InstructionBox({ children }: Props) {
  return (
    <div className='w-full p-4 border bg-stems-light-yellow border-stems-yellow rounded-2xl'>
      {children}
    </div>
  );
}
