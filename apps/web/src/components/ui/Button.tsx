import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false 
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-sage-500 text-white hover:bg-sage-700',
    secondary: 'bg-clay-500 text-white hover:bg-clay-700',
    outline: 'border border-paper-line text-paper-ink hover:bg-paper-100'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
