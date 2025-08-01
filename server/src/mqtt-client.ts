import * as mqtt from 'mqtt';
import { Logger, createLogger, transports, format } from 'winston';

// MQTT 客户端配置接口
export interface MqttClientConfig {
  host: string;
  port: number;
  protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  clientId?: string;
  username?: string;
  password?: string;
  reconnectPeriod?: number;
}

// 消息处理接口
export interface MessageHandler {
  (topic: string, message: string, packet: mqtt.Packet): void;
}

export class MqttClient {
  private client: mqtt.MqttClient | null = null;
  private config: MqttClientConfig;
  private logger: Logger;
  private subscriptions: Map<string, number> = new Map();

  constructor(config: MqttClientConfig) {
    this.config = {
      protocol: 'mqtt',
      clientId: `mqtt-client-${Math.random().toString(16).substring(2, 8)}`,
      reconnectPeriod: 1000,
      ...config,
    }

    // 配置日志
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
      transports: [new transports.Console()]
    });
  }

  /**
   * 连接到 MQTT 服务器
   */
  connect(): Promise<mqtt.MqttClient> {
    return new Promise((resolve, reject) => {
      if (this.client && this.client.connected) {
        this.logger.info('Already connected to MQTT broker');
        return resolve(this.client);
      }

      const url = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
      this.logger.info(`Connecting to MQTT broker: ${url}`);

      const options: mqtt.IClientOptions = {
        clientId: this.config.clientId,
        username: this.config.username,
        password: this.config.password,
        reconnectPeriod: this.config.reconnectPeriod,
        clean: true
      };

      this.client = mqtt.connect(url, options);

      // 连接成功
      this.client.on('connect', (connack) => {
        this.logger.info(`Connected to MQTT broker. Session present: ${connack.sessionPresent}`);
        resolve(this.client!);
      });

      // 连接错误
      this.client.on('error', (error) => {
        this.logger.error(`MQTT client error: ${error.message}`);
        reject(error);
      });

      // 重新连接
      this.client.on('reconnect', () => {
        this.logger.info('Reconnecting to MQTT broker...');
      });

      // 断开连接
      this.client.on('close', () => {
        this.logger.info('Disconnected from MQTT broker');
      });

      // 接收消息
      this.client.on('message', (topic, message, packet) => {
        this.logger.info(`Received message on topic "${topic}": ${message.toString()}`);
      });
    });
  }

  /**
   * 订阅主题
   * @param topic 主题名称
   * @param qos QoS 级别 (0, 1, 2)
   * @param callback 消息处理回调
   */
  subscribe(
    topic: string,
    qos: 0 | 1 | 2 = 0,
    callback?: MessageHandler
  ): Promise<mqtt.ISubscriptionMap> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      this.logger.info(`Subscribing to topic: ${topic} with QoS ${qos}`);

      this.client.subscribe(topic, { qos }, (error, granted) => {
        if (error) {
          this.logger.error(`Failed to subscribe to ${topic}: ${error.message}`);
          reject(error);
          return;
        }

        if (granted) {
          granted.forEach((grant) => {
            this.logger.info(`Successfully subscribed to ${grant.topic} with QoS ${grant.qos}`);
            this.subscriptions.set(grant.topic, grant.qos);
          });
        }

        // 如果提供了回调，为这个主题添加消息处理
        if (callback) {
          const messageHandler = (receivedTopic: string, message: Buffer, packet: mqtt.Packet) => {
            if (receivedTopic === topic) {
              callback(receivedTopic, message.toString(), packet);
            }
          };

          this.client!.on('message', messageHandler);
        }

        resolve({});
      });
    });
  }

  /**
   * 发布消息
   * @param topic 主题名称
   * @param message 消息内容
   * @param qos QoS 级别 (0, 1, 2)
   * @param retain 是否保留消息
   */
  publish(
    topic: string,
    message: string | Buffer,
    qos: 0 | 1 | 2 = 0,
    retain = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      this.logger.info(`Publishing message to ${topic}: ${message.toString()}`);

      this.client.publish(topic, message, { qos, retain }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish message to ${topic}: ${error.message}`);
          reject(error);
          return;
        }

        this.logger.info(`Message published successfully to ${topic}`);
        resolve();
      });
    });
  }

  /**
   * 取消订阅主题
   * @param topic 主题名称
   */
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      if (!this.subscriptions.has(topic)) {
        this.logger.warn(`Not subscribed to topic: ${topic}`);
        resolve();
        return;
      }

      this.logger.info(`Unsubscribing from topic: ${topic}`);

      this.client.unsubscribe(topic, (error: any) => {
        if (error) {
          this.logger.error(`Failed to unsubscribe from ${topic}: ${error.message}`);
          reject(error);
          return;
        }

        this.logger.info(`Successfully unsubscribed from ${topic}`);
        this.subscriptions.delete(topic);
        resolve();
      });
    });
  }

  /**
   * 断开与 MQTT 服务器的连接
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }

      this.logger.info('Disconnecting from MQTT broker...');

      this.client.end(false, undefined, () => {
        this.logger.info('Disconnected from MQTT broker');
        this.client = null;
        resolve();
      });
    });
  }

  /**
   * 检查客户端是否已连接
   */
  isConnected(): boolean {
    return !!this.client && this.client.connected;
  }

  /**
   * 获取当前订阅的所有主题
   */
  getSubscriptions(): Map<string, number> {
    return new Map(this.subscriptions);
  }
}
