'use client';
import React, { useState, MouseEvent } from 'react';
import Image from 'next/image';

// Boleh panggil komponen ni: <PremiumBottle3D src="/path/to/bottle.png" alt="Whisky" />
export default function PremiumBottle3D({ src, alt, className = "", imageClassName = "object-contain" }: { src: string, alt: string, className?: string, imageClassName?: string }) {
  const [transform, setTransform] = useState('');
  const [glint, setGlint] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Kira pergerakan mouse dari tengah (center)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Adjust nilai 15 ni untuk kawal tahap senget (lagi besar nilai, lagi sikit senget)
    const rotateX = ((y - centerY) / 15).toFixed(2);
    const rotateY = ((centerX - x) / 15).toFixed(2);

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    
    // Untuk efek cahaya (glint) pada botol
    setGlint({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.15
    });
  };

  const handleMouseLeave = () => {
    // Balik ke asal dengan smooth bila mouse keluar
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlint(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div 
      className={`relative w-full h-full transition-transform duration-200 ease-out cursor-pointer group ${className}`}
      style={{ transform, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gambar Botol */}
      <div className="relative w-full h-full drop-shadow-2xl">
        <Image 
          src={src} 
          alt={alt} 
          fill 
          className={imageClassName}
          sizes="(max-width: 768px) 100vw, 55vw"
          priority
        />
        
        {/* Efek Pantulan Cahaya (Glint) atas Kaca */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glint.x}% ${glint.y}%, rgba(255,255,255,${glint.opacity}) 0%, transparent 40%)`,
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
}
