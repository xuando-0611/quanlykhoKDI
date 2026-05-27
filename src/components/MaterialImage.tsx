/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cable, Cpu, Layers, Box, HelpCircle, HardDrive, ShieldAlert } from 'lucide-react';

interface MaterialImageProps {
  name: string;
  code: string;
  image?: string;
  className?: string;
}

export const MaterialImage: React.FC<MaterialImageProps> = ({ name, code, image, className = '' }) => {
  // If we have a custom Base64 uploaded image
  if (image && image.trim().startsWith('data:image/')) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}>
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Otherwise, determine a professional vector representation based on keyword
  const nameLower = name.toLowerCase();
  const codeLower = code.toLowerCase();

  let bgColor = 'bg-slate-50 border-slate-200 text-slate-500';
  let IconComponent = HelpCircle;

  if (nameLower.includes('cáp') || nameLower.includes('dây') || codeLower.includes('cadivi')) {
    bgColor = 'bg-amber-50 border-amber-200 text-amber-600';
    IconComponent = Cable;
  } else if (nameLower.includes('công tơ') || nameLower.includes('đồng hồ đo') || nameLower.includes('gelex') || nameLower.includes('kent')) {
    bgColor = 'bg-blue-50 border-blue-200 text-blue-600';
    IconComponent = Cpu;
  } else if (nameLower.includes('aptomat') || nameLower.includes('cb') || nameLower.includes('mccb') || nameLower.includes('panasonic')) {
    bgColor = 'bg-red-50 border-red-200 text-red-600';
    IconComponent = ShieldAlert;
  } else if (nameLower.includes('tủ điện') || nameLower.includes('vỏ tủ') || nameLower.includes('outdoor')) {
    bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-600';
    IconComponent = Box;
  } else if (nameLower.includes('ống') || nameLower.includes('uPVC') || nameLower.includes('tiền phong') || nameLower.includes('van')) {
    bgColor = 'bg-indigo-50 border-indigo-200 text-indigo-600';
    IconComponent = Layers;
  } else if (nameLower.includes('băng keo') || nameLower.includes('teflon') || nameLower.includes('cao su')) {
    bgColor = 'bg-purple-50 border-purple-200 text-purple-600';
    IconComponent = HardDrive;
  }

  return (
    <div className={`flex items-center justify-center rounded-lg border-2 border-dashed ${bgColor} ${className}`}>
      <div className="flex flex-col items-center justify-center space-y-1">
        <IconComponent className="h-2/5 w-2/5 stroke-[1.5]" />
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider opacity-80">{code.slice(0, 10)}</span>
      </div>
    </div>
  );
};
