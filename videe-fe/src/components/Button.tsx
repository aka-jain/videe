import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'transparent' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}) => {
  const baseClasses = 'inline-flex cursor-pointer items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-10 py-2';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    xs: 'px-0 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-800 text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-blue-700 focus:ring-blue-500 active:from-blue-600 active:to-blue-800',
    secondary: 'bg-gray-600 text-white shadow-lg hover:shadow-xl hover:from-gray-500 hover:to-gray-700 focus:ring-gray-500 active:from-gray-600 active:to-gray-800',
    transparent: 'bg-transparent text-blue-600 hover:bg-blue-50 focus:ring-blue-500 active:bg-blue-100',
    outline: 'border-1 border-blue-400 text-blue-400 bg-transparent hover:border-blue-300 hover:text-blue-300 focus:ring-blue-500 active:from-blue-500 active:to-blue-700',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    widthClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button; 