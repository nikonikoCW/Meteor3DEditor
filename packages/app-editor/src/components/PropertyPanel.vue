<template>
  <div class="prop-panel" v-if="selectedWidget">
    <h3>组件属性</h3>
    
    <!-- 通用属性 -->
    <div class="section">
      <h4>基础信息</h4>
      <div class="field">
          <label>类型</label>
          <span class="readonly">{{ selectedWidget.type }}</span>
      </div>
    </div>

    <!-- 布局属性 -->
    <div class="section">
      <h4>布局 (Layout)</h4>
      <div class="row">
        <div class="field half">
            <label>X</label>
            <input type="number" v-model.number="selectedWidget.position.x">
        </div>
        <div class="field half">
            <label>Y</label>
            <input type="number" v-model.number="selectedWidget.position.y">
        </div>
      </div>
      <div class="row" v-if="selectedWidget.size">
        <div class="field half">
            <label>宽 (W)</label>
            <input type="number" v-model.number="selectedWidget.size.width">
        </div>
        <div class="field half">
            <label>高 (H)</label>
            <input type="number" v-model.number="selectedWidget.size.height">
        </div>
      </div>
    </div>

    <!-- 动态渲染的特有属性 -->
    <div class="section" v-if="widgetProps.length > 0">
      <h4>组件配置</h4>
      <div v-for="prop in widgetProps" :key="prop.name" class="field">
        <label>{{ prop.label }}</label>
        
        <!-- Select 输入 -->
        <select 
            v-if="prop.type === 'select'" 
            v-model="selectedWidget.data[prop.name]"
        >
            <option v-for="opt in prop.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>

        <!-- Color 输入 -->
        <div v-else-if="prop.type === 'color'" class="color-input-wrapper">
             <input 
                type="color" 
                v-model="selectedWidget.data[prop.name]"
             >
             <span>{{ selectedWidget.data[prop.name] }}</span>
        </div>

        <!-- Text/Number 输入 -->
        <input 
            v-else 
            :type="prop.type === 'number' ? 'number' : 'text'"
            v-model="selectedWidget.data[prop.name]"
        >
      </div>
    </div>

  </div>
  <div class="prop-panel empty" v-else>
    <p>请选择一个组件进行编辑</p>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';
import { getWidgetDefinition } from '../core/widgetRegistry';

const appStore = useAppStore();
const { selectedWidget } = storeToRefs(appStore);

// 当前组件的动态属性配置
const widgetProps = ref([]);

// 当选中的组件改变时，更新配置表
watch(selectedWidget, async (newWidget) => {
    if (!newWidget) {
        widgetProps.value = [];
        return;
    }

    const def = getWidgetDefinition(newWidget.type);
    if (def && def.config.props) {
        // 深拷贝配置，避免污染原始定义
        const props = JSON.parse(JSON.stringify(def.config.props));
        
        // 处理需要异步获取选项的字段
        for (const prop of props) {
            // 如果定义里有 fetchOptions 方法（注意 JSON.stringify 会丢弃函数，所以我们需要回溯到 def.config）
            const originalProp = def.config.props.find(p => p.name === prop.name);
            if (originalProp && originalProp.fetchOptions) {
                // 执行异步加载
                console.log('Fetching options for', prop.name); // Debug log
                prop.options = await originalProp.fetchOptions();
                console.log('Options fetched:', prop.options); // Debug log
            }
            
            // 确保 data 中有默认值
            if (newWidget.data[prop.name] === undefined && prop.defaultValue !== undefined) {
                newWidget.data[prop.name] = prop.defaultValue;
            }
        }
        
        widgetProps.value = props;
    } else {
        widgetProps.value = [];
    }
}, { immediate: true });

</script>

<style scoped>
.prop-panel {
    width: 280px;
    background: #222;
    color: white;
    padding: 15px;
    border-left: 1px solid #333;
    overflow-y: auto;
}

.prop-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

h4 {
  font-size: 12px;
  color: #888;
  margin: 0 0 10px 0;
  text-transform: uppercase;
}

.section {
  margin-bottom: 20px;
  background: #2a2a2a;
  padding: 10px;
  border-radius: 4px;
}

.field {
    margin-bottom: 10px;
}

.row {
  display: flex;
  gap: 10px;
}

.field.half {
  flex: 1;
}

label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
    font-size: 12px;
}

input, select {
    width: 100%;
    background: #333;
    border: 1px solid #444;
    color: white;
    padding: 6px;
    border-radius: 3px;
    font-size: 13px;
}

input:focus, select:focus {
  outline: none;
  border-color: #42b983;
}

.color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.color-input-wrapper input[type="color"] {
    width: 40px;
    height: 25px;
    padding: 0;
    border: none;
}

.readonly {
  color: #888;
  font-size: 13px;
}
</style>
