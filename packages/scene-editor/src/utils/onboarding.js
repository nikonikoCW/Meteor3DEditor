/**
 * 新手引导模块 - 基于 Driver.js
 * 引导新用户完成场景编辑器的基本配置流程
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * 启动新手引导
 * @param {Object} options
 * @param {Function} options.onSwitchToGisTab - 切换到 GIS 标签的回调
 */
export function startOnboarding({ onSwitchToGisTab } = {}) {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.65)',
        doneBtnText: '完成 🎉',
        nextBtnText: '下一步 →',
        prevBtnText: '← 上一步',
        progressText: '{{current}} / {{total}}',
        steps: [
            {
                element: '#env-section',
                popover: {
                    title: '🌅 添加环境贴图',
                    description: '从资源库中拖拽一个环境贴图（天空、光照）到上方的视口区域，为你的场景添加背景天空。',
                    side: 'top',
                    align: 'start'
                }
            },
            {
                element: '#gis-tab',
                popover: {
                    title: '🌍 进入 GIS 配置',
                    description: '点击此标签切换到 GIS 配置面板，配置场景的地理信息。',
                    side: 'left',
                    align: 'start'
                },
                onHighlighted: () => {
                    // 自动切换到 GIS 标签页
                    onSwitchToGisTab?.();
                }
            },
            {
                element: '#enable-gis-btn',
                popover: {
                    title: '📍 启用地理环境',
                    description: '点击「启用地理环境」按钮，在地图上选择场景的地理位置，开启经纬度坐标系统。',
                    side: 'left',
                    align: 'start'
                }
            },
            {
                element: '#basemap-row',
                popover: {
                    title: '🗺️ 显示影像地图',
                    description: '开启「显示影像地图」开关，在场景中叠加卫星影像底图。',
                    side: 'left',
                    align: 'start'
                }
            }
        ]
    });

    driverObj.drive();
    return driverObj;
}
