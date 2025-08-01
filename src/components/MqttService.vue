<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <!-- 顶部导航栏 -->
    <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <i class="fas fa-broadcast-tower text-blue-500 text-2xl"></i>
          <h1 class="text-xl font-bold">WebSocket 数据监控</h1>
        </div>

        <div class="flex items-center space-x-4">
          <!-- 连接状态指示器 -->
          <div class="flex items-center">
            <span class="mr-2 text-sm">连接状态:</span>
            <span class="relative inline-flex h-3 w-3">
              <span
                :class="statusClass"
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              ></span>
              <span
                :class="statusDotClass"
                class="relative inline-flex rounded-full h-3 w-3"
              ></span>
            </span>
            <span class="ml-2 text-sm font-medium">{{ connectionStatus }}</span>
          </div>

          <!-- 主题切换按钮 -->
          <button
            @click="toggleDarkMode"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="切换主题"
          >
            <i class="fas" :class="isDarkMode ? 'fa-sun' : 'fa-moon'"></i>
          </button>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-6">
      <!-- 连接配置区域 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <label for="wsUrl" class="block text-sm font-medium mb-1">WebSocket 地址</label>
            <div class="flex">
              <input
                v-model="wsUrl"
                id="wsUrl"
                type="text"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ws://localhost:8080"
              >
              <button
                @click="connect"
                :disabled="isConnected || isConnecting"
                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-md transition-colors disabled:bg-gray-400"
              >
                <i class="fas mr-1" :class="isConnecting ? 'fa-spinner fa-spin' : 'fa-plug'"></i>
                {{ isConnecting ? '连接中...' : '连接' }}
              </button>
              <button
                @click="disconnect"
                :disabled="!isConnected"
                class="ml-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:bg-gray-400"
              >
                <i class="fas fa-unplug mr-1"></i>断开
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              @click="clearMessages"
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <i class="fas fa-trash mr-1"></i>清空消息
            </button>

            <button
              @click="scrollToBottom"
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <i class="fas fa-arrow-down mr-1"></i>滚动到底部
            </button>
          </div>
        </div>
      </div>

      <!-- 消息过滤区域 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <label for="filterTopic" class="block text-sm font-medium mb-1">按主题过滤</label>
            <input
              v-model="filterTopic"
              id="filterTopic"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入主题关键词过滤"
            >
          </div>

          <div class="w-full md:w-48">
            <label class="block text-sm font-medium mb-1">消息类型</label>
            <select
              v-model="messageTypeFilter"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有消息</option>
              <option value="json">JSON 消息</option>
              <option value="text">文本消息</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 消息列表区域 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 class="font-semibold">接收消息列表</h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ filteredMessages.length }} 条消息</span>
        </div>

        <div
          ref="messagesContainer"
          class="h-[500px] overflow-y-auto p-4 space-y-4"
        >
          <!-- 空状态 -->
          <div
            v-if="filteredMessages.length === 0 && !isLoading"
            class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
          >
            <i class="fas fa-inbox text-5xl mb-4 opacity-30"></i>
            <p>暂无消息</p>
            <p class="text-sm mt-1">连接后将显示接收的消息</p>
          </div>

          <!-- 加载状态 -->
          <div
            v-if="isLoading"
            class="flex justify-center items-center h-full"
          >
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>

          <!-- 消息项 -->
          <div
            v-for="(message, index) in filteredMessages"
            :key="index"
            class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center">
                <span class="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">
                  {{ message.topic || '无主题' }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(message.timestamp) }}
                </span>
              </div>
              <span
                :class="messageTypeClass(message)"
                class="text-xs font-medium px-2 py-0.5 rounded"
              >
                {{ message.isJson ? 'JSON' : '文本' }}
              </span>
            </div>

            <div class="mt-2">
              <pre
                v-if="message.isJson"
                class="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto"
              >{{ JSON.stringify(message.data, null, 2) }}</pre>

              <div
                v-else
                class="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm"
              >{{ message.data }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="mt-8 py-4 border-t border-gray-200 dark:border-gray-800">
      <div class="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        WebSocket 数据监控面板 &copy; {{ new Date().getFullYear() }}
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';

// 类型定义
interface WebSocketMessage {
  timestamp: Date;
  topic?: string;
  data: any;
  isJson: boolean;
}

// 状态变量
const wsUrl = ref('ws://localhost:3000');
const webSocket = ref<WebSocket | null>(null);
const isConnected = ref(false);
const isConnecting = ref(false);
const connectionStatus = ref('未连接');
const statusClass = ref('bg-gray-400');
const statusDotClass = ref('bg-gray-500');
const messages = ref<WebSocketMessage[]>([]);
const isLoading = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const filterTopic = ref('');
const messageTypeFilter = ref('all');
const isDarkMode = ref(false);

// 切换暗黑模式
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark');
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 根据消息类型获取样式类
const messageTypeClass = (message: WebSocketMessage) => {
  return message.isJson
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
};

// 过滤消息
const filteredMessages = computed(() => {
  return messages.value.filter(message => {
    // 主题过滤
    const topicMatch = !filterTopic.value ||
      (message.topic && message.topic.includes(filterTopic.value));

    // 消息类型过滤
    const typeMatch = messageTypeFilter.value === 'all' ||
      (messageTypeFilter.value === 'json' && message.isJson) ||
      (messageTypeFilter.value === 'text' && !message.isJson);

    return topicMatch && typeMatch;
  });
});

// 连接WebSocket
const connect = () => {
  if (isConnected.value || isConnecting.value) return;

  isConnecting.value = true;
  updateConnectionStatus('连接中...', 'bg-yellow-400', 'bg-yellow-500');

  try {
    webSocket.value = new WebSocket(wsUrl.value);

    webSocket.value.onopen = () => {
      isConnected.value = true;
      isConnecting.value = false;
      updateConnectionStatus('已连接', 'bg-green-400', 'bg-green-500');
      console.log('WebSocket连接已建立');
    };

    webSocket.value.onmessage = (event) => {
      handleMessage(event.data);
    };

    webSocket.value.onclose = (event) => {
      isConnected.value = false;
      isConnecting.value = false;
      updateConnectionStatus(`已断开 (${event.code})`, 'bg-red-400', 'bg-red-500');
      console.log(`WebSocket连接已关闭: ${event.code}`);
    };

    webSocket.value.onerror = (error) => {
      isConnected.value = false;
      isConnecting.value = false;
      updateConnectionStatus('连接错误', 'bg-red-400', 'bg-red-500');
      console.error('WebSocket错误:', error);
    };
  } catch (error) {
    isConnected.value = false;
    isConnecting.value = false;
    updateConnectionStatus('连接失败', 'bg-red-400', 'bg-red-500');
    console.error('连接WebSocket失败:', error);
  }
};

// 断开WebSocket连接
const disconnect = () => {
  if (webSocket.value) {
    webSocket.value.close();
    webSocket.value = null;
  }
};

// 处理接收到的消息
const handleMessage = (data: string) => {
  try {
    // 尝试解析为JSON
    const parsedData = JSON.parse(data);
    // 检查是否包含topic字段，没有则尝试从数据中提取
    const topic = parsedData.topic || (parsedData.data?.topic) || undefined;

    messages.value.push({
      timestamp: new Date(),
      topic,
      data: parsedData,
      isJson: true
    });
  } catch (e) {
    // 不是JSON格式，作为文本处理
    messages.value.push({
      timestamp: new Date(),
      data,
      isJson: false
    });
  }

  // 自动滚动到底部
  scrollToBottom();
};

// 更新连接状态显示
const updateConnectionStatus = (status: string, pulseClass: string, dotClass: string) => {
  connectionStatus.value = status;
  statusClass.value = pulseClass;
  statusDotClass.value = dotClass;
};

// 清空消息列表
const clearMessages = () => {
  messages.value = [];
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 组件挂载时检查暗黑模式偏好
onMounted(() => {
  // 检查用户系统偏好
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  }

  // 自动连接
  connect();
});

// 监听窗口关闭事件，确保断开连接
window.addEventListener('beforeunload', () => {
  disconnect();
});
</script>

<style scoped>
/* 基础样式补充 */
pre {
  font-family: 'Fira Code', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 动画效果 */
.animate-ping {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  70% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
