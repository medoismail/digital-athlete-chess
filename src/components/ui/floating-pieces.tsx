'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function ChessPiece({ position, rotation, scale, speed }: { 
  position: [number, number, number]; 
  rotation: [number, number, number];
  scale: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        {/* Simple geometric shape representing chess piece */}
        <cylinderGeometry args={[0.3, 0.5, 1, 8]} />
        <meshStandardMaterial 
          color="#8B5CF6" 
          transparent 
          opacity={0.15}
          emissive="#8B5CF6"
          emissiveIntensity={0.1}
        />
      </mesh>
    </Float>
  );
}

function FloatingParticles({ count = 20 }: { count?: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5 - 2,
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      scale: 0.3 + Math.random() * 0.4,
      speed: 0.5 + Math.random() * 1.5,
    }));
  }, [count]);

  return (
    <>
      {particles.map((particle) => (
        <ChessPiece key={particle.id} {...particle} />
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <FloatingParticles count={15} />
    </>
  );
}

export function FloatingPiecesBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
