import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function Tooltip({ children, explanation }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative w-full h-full group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {show && (
        <div className="absolute z-[100] w-64 p-3 bg-gray-900 dark:bg-black text-white text-xs rounded-xl shadow-2xl border border-gray-700 top-full mt-2 left-1/2 -translate-x-1/2 animate-fade-in pointer-events-none">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-black border-t border-l border-gray-700 transform rotate-45" />
          <p className="relative z-10 leading-relaxed font-sans font-medium">{explanation}</p>
        </div>
      )}
    </div>
  );
}
