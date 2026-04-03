import * as React from 'react';
import { cn } from '@/lib/utils';

const DropdownMenu = React.createContext(null);

function DropdownMenuRoot({ children }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <DropdownMenu.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownMenu.Provider>
  );
}

function DropdownMenuTrigger({ children, asChild, className, ...props }) {
  const { open, setOpen } = React.useContext(DropdownMenu);
  const handleClick = () => setOpen(!open);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        handleClick();
        children.props.onClick?.(e);
      },
    });
  }

  return (
    <button onClick={handleClick} className={className} {...props}>
      {children}
    </button>
  );
}

function DropdownMenuContent({ children, className, align = 'end', ...props }) {
  const { open, setOpen } = React.useContext(DropdownMenu);
  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-white p-1 shadow-lg animate-in fade-in-0 zoom-in-95',
        align === 'end' ? 'right-0' : 'left-0',
        'top-full mt-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({ children, className, onClick, destructive, disabled, ...props }) {
  const { setOpen } = React.useContext(DropdownMenu);

  return (
    <button
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100',
        destructive && 'text-red-600 hover:bg-red-50 focus:bg-red-50',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({ className }) {
  return <div className={cn('my-1 h-px bg-border', className)} />;
}

function DropdownMenuLabel({ children, className }) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-semibold text-text-muted', className)}>
      {children}
    </div>
  );
}

export {
  DropdownMenuRoot as DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
