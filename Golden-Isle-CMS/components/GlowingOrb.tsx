"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function GlowingOrb({ size = 50, className = "" }: { size?: number, className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        const width = size;
        const height = size;

        const scene = new THREE.Scene();
        // Adjust camera to fit the orb in the box nicely
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.z = 4.5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Clear previous children just in case (strict mode)
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(renderer.domElement);

        const vertexShader = `
            uniform float time;
            varying vec2 vUv;
            varying float vElevation;

            vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
            vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
            float snoise(vec3 v){ 
                const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
                const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy) );
                vec3 x0 = v - i + dot(i, C.xxx) ;
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min( g.xyz, l.zxy );
                vec3 i2 = max( g.xyz, l.zxy );
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod(i, 289.0 ); 
                vec4 p = permute( permute( permute( 
                            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                float n_ = 1.0/7.0;
                vec3  ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_ );
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4( x.xy, y.xy );
                vec4 b1 = vec4( x.zw, y.zw );
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }

            void main() {
                vUv = uv;
                float noise = snoise(position * 1.5 + time * 0.4) * 0.25;
                float bands = sin(position.y * 12.0 - time * 2.0) * 0.05;
                float totalDisplacement = noise + bands;
                vElevation = totalDisplacement;
                vec3 newPosition = position + normal * totalDisplacement;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float time;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                vec3 colorBottom = vec3(0.4, 0.0, 0.7);
                vec3 colorMiddle = vec3(1.0, 0.8, 0.2);
                vec3 colorTop = vec3(0.8, 0.2, 0.8);
                
                float mixStrength = vUv.y + vElevation * 0.8;
                
                vec3 finalColor = mix(colorBottom, colorMiddle, smoothstep(0.1, 0.5, mixStrength));
                finalColor = mix(finalColor, colorTop, smoothstep(0.5, 0.9, mixStrength));
                
                float rim = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
                finalColor -= rim * 0.1;
                
                gl_FragColor = vec4(finalColor * 1.2, 1.0);
            }
        `;

        const geometry = new THREE.SphereGeometry(1.5, 64, 64);
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                time: { value: 0.0 }
            },
            wireframe: false
        });
        
        const orb = new THREE.Mesh(geometry, material);
        scene.add(orb);

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 150;
        const posArray = new Float32Array(particlesCount * 3);
        const colorsArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i+=3) {
            posArray[i] = (Math.random() - 0.5) * 5;
            posArray[i+1] = (Math.random() - 0.5) * 5;
            posArray[i+2] = (Math.random() - 0.5) * 5 - 1;
            
            const colorType = Math.random();
            if(colorType > 0.6) {
                colorsArray[i] = 0; colorsArray[i+1] = 1; colorsArray[i+2] = 1; 
            } else if (colorType > 0.3) {
                colorsArray[i] = 1; colorsArray[i+1] = 0; colorsArray[i+2] = 1; 
            } else {
                colorsArray[i] = 1; colorsArray[i+1] = 1; colorsArray[i+2] = 0; 
            }
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        const clock = new THREE.Clock();
        let animationFrameId: number;

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            material.uniforms.time.value = elapsedTime;

            orb.rotation.y = elapsedTime * 0.1;
            orb.rotation.z = Math.sin(elapsedTime * 0.2) * 0.1;
            
            particlesMesh.rotation.y = elapsedTime * 0.02;

            const scale = 1.0 + Math.sin(elapsedTime * 1.5) * 0.03;
            orb.scale.set(scale, scale, scale);

            renderer.render(scene, camera);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            particlesGeometry.dispose();
            particlesMaterial.dispose();
        };
    }, [size]);

    return (
        <div 
            ref={containerRef} 
            style={{ width: size, height: size }}
            className={`pointer-events-none flex items-center justify-center overflow-hidden rounded-full ${className}`}
        />
    );
}
