import GalleryRoom from './Gallery/GalleryRoom';
import StudioRoom from './Studio/StudioRoom';
import AboutRoom from './About/AboutRoom';
import ContactRoom from './Contact/ContactRoom';

/**
 * roomId → 房间组件
 *
 * 必须静态导入（不要改成 lazy()/Suspense）：
 * RoomWarmup 依赖在屏幕外「急切挂载」全部房间，把着色器/纹理提前编译上传到 GPU，
 * 改成懒加载会把预热推迟到首次进房间那一刻，第一帧必定卡顿。
 */
export const ROOM_COMPONENTS = {
    gallery: GalleryRoom,
    studio: StudioRoom,
    about: AboutRoom,
    contact: ContactRoom,
};

/** 取房间组件；未注册的房间返回 null（RoomInterior 会退回通用房间） */
export const getRoomComponent = (roomId) => ROOM_COMPONENTS[roomId] || null;