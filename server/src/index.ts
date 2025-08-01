import { MqttClient, MqttClientConfig } from './mqtt-client'
import WebSocket, { WebSocketServer } from 'ws'
import express from 'express'
import http from 'http'

// 创建Express应用
const app = express();
const server = http.createServer(app);
// 创建WebSocket服务器
const wss = new WebSocketServer({ server });
// 存储所有连接的WebSocket客户端
const webSocketClients = new Set<WebSocket>();

// 向前端广播消息
function broadcastToFrontend(data: any) {
  const message = JSON.stringify(data);

  webSocketClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 处理WebSocket连接
wss.on('connection', (ws) => {
  console.log('New frontend client connected');
  webSocketClients.add(ws);

  // 客户端断开连接时移除
  ws.on('close', () => {
    console.log('Frontend client disconnected');
    webSocketClients.delete(ws);
  });

  // 处理来自前端的消息
  ws.on('message', (message) => {
    console.log('Received from frontend:', message.toString());
    // 可以在这里处理前端发送的消息，例如发布到MQTT
  });
});

// 配置 MQTT 连接参数
const mqttConfig: MqttClientConfig = {
  host: 'r-bj-iot.niu.com', // MQTT 服务器地址，默认本地
  port: 1883, // 默认 MQTT 端口
  // 如果需要认证，可以添加以下配置
  username: 'rabbit-management',
  password: 'ZQqR8NffqTTk3WsAJfpHxVh0hUqDRBMHCKir9',
}
// mqttPublishTopic = 'h2/' + h2id + '/cs'
// mqttSubscribeTopic = 'h2/' + h2id + '/sc'
// 示例主题
const testTopic = 'h2/1754029457172/sc'
const anotherTopic = 'h2/1754029457172/cs'

async function main() {
  // 创建 MQTT 客户端实例
  const mqttClient = new MqttClient(mqttConfig)

  try {
    // 连接到 MQTT 服务器
    await mqttClient.connect()

    // 订阅测试主题，并指定消息处理回调
    await mqttClient.subscribe(testTopic, 0, (topic, message) => {
      console.log(`Custom handler - Received message on ${topic}: ${message}`)
      // 准备要发送给前端的数据
      const dataToSend = {
        topic,
        message,
        timestamp: new Date().toISOString(),
        type: 'mqtt_message',
      }
      // 发送到所有连接的前端客户端
      broadcastToFrontend(dataToSend)
    })

    // // 订阅另一个主题
    // await mqttClient.subscribe(testTopic, 0)

    // // 显示当前订阅的主题
    // console.log('Current subscriptions:', Array.from(mqttClient.getSubscriptions().keys()))

    // // 发布一条消息到测试主题
    // await mqttClient.publish(testTopic, 'Hello from TypeScript MQTT client!', 1)

    // // 发布一条JSON格式的消息
    // const jsonMessage = JSON.stringify({
    //   timestamp: new Date().toISOString(),
    //   temperature: 25.5,
    //   humidity: 60.2,
    //   deviceId: 'sensor-001',
    // })
    // await mqttClient.publish(testTopic, jsonMessage, 1)

    // // 发布一条消息到另一个主题
    // await mqttClient.publish(anotherTopic, 'This is a message for another topic', 0)

    // // 等待一段时间接收可能的回复
    // await new Promise((resolve) => setTimeout(resolve, 5000))

    // // 取消订阅测试主题
    // await mqttClient.unsubscribe(testTopic)

    // // 再次发布消息，此时不会再收到（因为已取消订阅）
    // await mqttClient.publish(testTopic, 'This message should not be received', 1)

    // // 等待片刻
    // 启动HTTP服务器
    const PORT = process.env.PORT || 3000
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log('Frontend available at http://localhost:3000')
    })

    // 保持程序运行
    process.on('SIGINT', async () => {
      await mqttClient.disconnect()
      server.close()
      process.exit(0)
    })
  } catch (error) {
    console.error('An error occurred:', error)
    process.exit(1)
  }
}

// 启动程序
main()
