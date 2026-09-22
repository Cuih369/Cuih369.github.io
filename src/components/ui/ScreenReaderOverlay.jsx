import { useScene } from '../../context/SceneContext';
import { useGalleryProjects, useStudioContent, useAwards } from '../../hooks/useSanityData';
import '../../styles/ScreenReaderOverlay.scss';
import { ROOMS, getRoomById } from '../../config/rooms';

// 平台标识 → 展示名称映射（供屏幕阅读器与爬虫读取）
const PLATFORM_LABELS = {
    youtube: 'YouTube',
    blog: '博客',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    x: 'X（Twitter）',
    linkedin: '领英',
    codrops: 'Codrops',
};

/**
 * ScreenReaderOverlay — A7 可访问性
 * 
 * 提供 3D canvas 内容屏幕阅读器访问的不可见 HTML 层。
 * 包含与可交互 3D 元素（门、房间）对应的按钮/链接。
 * 通过 .sr-only 视觉隐藏，但完全可被辅助技术访问。
 */
const ScreenReaderOverlay = () => {
    const { hasEntered, isInRoom, currentRoom, teleportTo, requestExit } = useScene();
    
    // 获取数据以生成供 SEO / 爬虫使用的不可见 HTML
    const projects = useGalleryProjects();
    const studio = useStudioContent();
    const awards = useAwards();

    return (
        <div className="sr-overlay" role="complementary" aria-label="3D 作品集可访问导航">
            {/* Skip to content link */}
            <a href="#sr-main-nav" className="sr-only sr-focusable">
                跳转至可访问导航
            </a>

            {/* Main accessible navigation */}
            <nav id="sr-main-nav" className="sr-only" aria-label="作品集房间">
                <h1>ITom — 创意开发者作品集</h1>
                <h2>作品集导航</h2>

                {!hasEntered && (
                    <p>欢迎来到 ITom 的交互式 3D 作品集。点击门或按 Enter 键进入。</p>
                )}

                {hasEntered && !isInRoom && (
                    <>
                        <p>你正在走廊中。选择一个房间探索：</p>
                        <ul>
                            {ROOMS.map((room) => (
                                <li key={room.id}>
                                    <button onClick={() => teleportTo(room.id)} type="button">
                                        {room.sr.name} — {room.sr.hint}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {hasEntered && isInRoom && (
                    <>
                        <p>
                            你正在{getRoomById(currentRoom)?.sr.name || currentRoom}房间。
                        </p>
                        <button onClick={requestExit} type="button">
                            返回走廊
                        </button>

                        {/* Room-specific content descriptions */}
                        {currentRoom === 'about' && (
                            <div aria-label="关于房间内容">
                                <h3>关于我</h3>
                                <p>这个房间包含我的个人故事、奖项、旅程里程碑和以交互式气球展示的技术技能。</p>

                                {awards && (
                                    <section>
                                        <h4>我的奖项</h4>
                                        <ul>
                                            {awards.sotd && awards.sotd.items && awards.sotd.items.map((a, i) => (
                                                <li key={i}>{a.label} - {a.date} {a.url && <a href={a.url}>查看</a>}</li>
                                            ))}
                                            {awards.sotm && awards.sotm.items && awards.sotm.items.map((a, i) => (
                                                <li key={i}>{a.label} - {a.date} {a.url && <a href={a.url}>查看</a>}</li>
                                            ))}
                                            {awards.other && awards.other.items && awards.other.items.map((a, i) => (
                                                <li key={i}>{a.label} - {a.date} {a.url && <a href={a.url}>查看</a>}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>
                        )}
                        {currentRoom === 'gallery' && (
                            <div aria-label="作品集房间内容">
                                <h3>我的项目</h3>
                                <p>浏览以纸质卡片展示的作品集项目。点击项目卡片查看详情并访问在线站点。</p>

                                {projects && projects.length > 0 && (
                                    <ul>
                                        {projects.map((p, i) => (
                                            <li key={i}>
                                                <h4>{p.title}</h4>
                                                <p>{p.description}</p>
                                                {p.url && <a href={p.url}>访问 {p.title}</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        {currentRoom === 'contact' && (
                            <div aria-label="联系房间内容">
                                <h3>联系我</h3>
                                <p>找到以漂浮木桶展示的社交媒体链接。点击访问我的 LinkedIn、GitHub 等平台主页。</p>
                            </div>
                        )}
                        {currentRoom === 'studio' && (
                            <div aria-label="工作室房间内容">
                                <h3>工作室</h3>
                                <p>在旋转的显示器上探索我的经验和技能。点击显示器阅读关于我工作的详细信息。</p>

                                {studio && studio.length > 0 && (
                                    <ul>
                                        {studio.map((s, i) => (
                                            <li key={i}>
                                                <h4>{s.title}（{PLATFORM_LABELS[s.platform] || s.platform}）</h4>
                                                <p>{s.description}</p>
                                                {s.url && <a href={s.url}>查看内容</a>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Quick navigation to other rooms */}
                        <h3>快速导航</h3>
                        <ul>
                            {ROOMS.map((room) => (
                                currentRoom !== room.id && (
                                    <li key={room.id}>
                                        <button onClick={() => teleportTo(room.id)} type="button">前往{room.sr.name}</button>
                                    </li>
                                )
                            ))}
                        </ul>
                    </>
                )}
            </nav>

            {/* 状态变化的实时区域 */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isInRoom && `已进入 ${currentRoom} 房间`}
            </div>
        </div>
    );
};

export default ScreenReaderOverlay;
