import { useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// 房间组件映射 + 房间注册表（必须在顶层静态导入：预热依赖急切挂载全部房间）
import { ROOM_COMPONENTS } from '../rooms/roomRegistry';
import { ROOMS } from '../../../config/rooms';
import { isSanityDataLoaded } from '../../../hooks/useSanityData';

/**
 * RoomWarmup Component
 * 
 * Mounts all 4 rooms off-screen during the preloader phase to force
 * shader compilation and texture upload to GPU. After a few frames,
 * it unmounts the rooms to free memory. This ensures the first room
 * entry has zero shader compilation stutter.
 * 
 * Positioned 500 units below the scene so nothing is visible.
 * Audio components won't be audible at this distance.
 */
const RoomWarmup = ({ onWarmupComplete, isLowTier }) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    // Wait for rooms to render a few frames, then compile and unmount
    const warmupStart = useRef(performance.now());

    useFrame(() => {
        if (isDone || completeFired.current) return;

        // Wait until Sanity data is loaded before starting warmup
        if (!isSanityDataLoaded()) return;

        frameCount.current++;

        // For low tier, we skip warmup, but still wait 1 frame for entrance to mount
        const targetFrames = isLowTier ? 1 : 3;

        if (frameCount.current >= targetFrames) {
            completeFired.current = true;

            const finishWarmup = () => {
                const warmupDuration = ((performance.now() - warmupStart.current) / 1000).toFixed(2);
                // console.info(`🔥 GPU/Shader Warmup Complete: ${warmupDuration}s ${isLowTier ? '(Bypassed for LOW tier)' : ''}`);
                
                requestAnimationFrame(() => {
                    setIsDone(true);
                    onWarmupComplete?.();
                });
            };

            // On low tier, bypass intense gl.compileAsync to save memory and avoid Context Lost
            if (isLowTier) {
                finishWarmup();
                return;
            }

            // Force compile all shaders in the scene (including warm-up rooms)
            // Use 2026 compileAsync to avoid blocking the main thread!
            if (gl.compileAsync) {
                gl.compileAsync(scene, camera, scene)
                    .then(finishWarmup)
                    .catch((err) => {
                        console.error('Async compilation failed, falling back to sync', err);
                        gl.compile(scene, camera);
                        finishWarmup();
                    });
            } else {
                gl.compile(scene, camera);
                finishWarmup();
            }
        }
    });

    if (isDone) return null;

    // Do not mount rooms at all on low end devices to prevent WebGL Context Lost
    if (isLowTier) return null;

    // Dummy handlers to prevent errors (rooms expect these props)
    const noop = () => {};

    return (
        <group position={[0, -500, 0]}>
            {/* Mount all rooms in Suspense - positioned far below camera */}
            {/* 挂载顺序 = rooms.js 中 ROOMS 的声明顺序 */}
            {ROOMS.map((room) => {
                const RoomComponent = ROOM_COMPONENTS[room.id];
                if (!RoomComponent || !room.warmupPosition) return null;

                return (
                    <Suspense key={room.id} fallback={null}>
                        <group position={room.warmupPosition}>
                            <RoomComponent showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                        </group>
                    </Suspense>
                );
            })}
        </group>
    );
};

export default RoomWarmup;
