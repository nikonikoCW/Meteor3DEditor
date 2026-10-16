<template>
  <LabelWidget :key="sceneKey" :data="labelData" :enabled="enabled" :widget-id="widgetId" />
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import LabelWidget from './LabelWidget.vue';
import { useAppStore } from '../../stores/appStore';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  enabled: { type: Boolean, default: true },
  widgetId: { type: String, default: '' }
});
const appStore = useAppStore();
const owner = `monitor-${crypto.randomUUID()}`;
// A new label component must own the labels of each scene independently.
const sceneKey = ref(0);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const labelData = computed(() => {
  const items = props.data.config ?? [];
  const labels = Array.isArray(items) ? items.filter(item => item && typeof item === 'object').map(item => {
    const width = item.width ?? 320;
    const height = item.videoHeight ?? item.height ?? 180;
    const validSize = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
    let content = '请填写视频地址';
    if (!validSize) content = '视频宽高必须为正数';
    else if (item.url) {
      try {
        const url = new URL(item.url, document.baseURI);
        if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('protocol');
        content = `<video src="${escapeHTML(url.href)}" controls autoplay muted playsinline loop preload="metadata" style="display:block;width:100%;height:100%;object-fit:contain;background:#000">浏览器不支持视频播放</video>`;
      } catch {
        content = '视频地址无效，请使用 HTTP(S) 视频地址';
      }
    }
    const location = item.position ? { ...item.position } : { ...item };
    return {
      ...location,
      // Do not reuse user IDs: multiple monitor components may contain the same camera.
      id: undefined,
      // Zero-size wrapper anchors the line endpoint to the projected scene point.
      // Only the player receives pointer events so the line never blocks scene navigation.
      content: `<div data-video-monitor="${owner}" style="position:relative;width:0;height:0;overflow:visible;pointer-events:none">
        <div style="position:absolute;left:0;bottom:-4px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none">
          <div style="width:${validSize ? width : 320}px;box-sizing:content-box;border:1px solid rgba(80,220,255,.75);border-radius:6px;overflow:hidden;background:linear-gradient(135deg,rgba(14,46,68,.96),rgba(6,20,34,.96));box-shadow:0 0 18px rgba(0,184,255,.2),inset 0 0 20px rgba(46,203,255,.06);pointer-events:auto">
            <div style="height:34px;box-sizing:border-box;padding:0 10px;display:flex;align-items:center;gap:8px;background:rgba(35,145,190,.16);border-bottom:1px solid rgba(80,220,255,.28);color:#e5faff;font:600 13px/1.3 sans-serif">
              <span aria-hidden="true" style="color:#64e4ff">▣</span>
              <span style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHTML(item.name || '视频监控')}</span>
              <span style="margin-left:auto;flex-shrink:0;color:#7fa9b8;font-size:10px;font-weight:400">VIDEO</span>
            </div>
            <div style="width:100%;height:${validSize ? height : 180}px;background:#080f18;color:#a9cbd7;font:12px/1.5 sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden">${content}</div>
          </div>
          <div aria-hidden="true" style="width:1px;height:58px;background:linear-gradient(to bottom,#55ddff,rgba(85,221,255,.35));box-shadow:0 0 5px rgba(85,221,255,.55)"></div>
          <div aria-hidden="true" style="width:8px;height:8px;box-sizing:border-box;border:2px solid #64e4ff;border-radius:50%;background:rgba(8,30,48,.92);box-shadow:0 0 0 4px rgba(80,220,255,.12),0 0 10px rgba(80,220,255,.7)"></div>
        </div>
      </div>`
    };
  }) : [];
  return { labelConfig: { template: '{{content}}', style: '', labels } };
});

const stopVideos = () => {
  document.querySelectorAll(`[data-video-monitor="${owner}"] video`).forEach(video => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  });
};
// Run before LabelWidget replaces/removes its DOM so media requests are released.
watch([() => props.data, () => props.enabled], stopVideos, { deep: true, flush: 'sync' });
watch(() => appStore.sceneInstance, () => {
  stopVideos();
  sceneKey.value++;
}, { flush: 'sync' });
onBeforeUnmount(stopVideos);
</script>
