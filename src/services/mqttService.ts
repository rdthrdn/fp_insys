import mqtt, { MqttClient, IClientOptions } from 'mqtt';

// --- HARDCODE UNTUK TES ---
// Pastikan variabel ini ada di .env.local dan diawali dengan NEXT_PUBLIC_
const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL || 'ws://147.182.226.225:9001';
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || '';
// --- AKHIR HARDCODE ---

const options: IClientOptions = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  protocol: 'ws',
  reconnectPeriod: 2000,
  connectTimeout: 15000,
  keepalive: 60,
  clean: true,
  resubscribe: true,
};

class MqttService {
  private client: MqttClient | null = null;
  private messageHandlers: Map<string, (topic: string, payload: Buffer) => void> = new Map();

  connect() {
    if (!this.client?.connected) {
      try {
        console.log(`🔌 MQTT: Mencoba terhubung dengan user: ${MQTT_USERNAME}`);
        console.log(`🔌 MQTT: URL: ${MQTT_URL}`);
        
        // Hentikan koneksi lama jika ada
        if (this.client) {
            this.client.end(true);
        }
        
        this.client = mqtt.connect(MQTT_URL, options);

        this.client.on('connect', () => {
          console.log('✅ MQTT: Terhubung ke broker');
          console.log('🔑 MQTT: Menggunakan username:', MQTT_USERNAME);
        });

        this.client.on('error', (err) => {
          console.error('❌ MQTT Connection Error:', err);
          this.client?.end();
        });

        this.client.on('reconnect', () => {
          console.log('🔄 MQTT: Mencoba terhubung kembali...');
        });

        this.client.on('close', () => {
            console.log('🔌 MQTT: Koneksi ditutup');
        });

        // Set up global message handler
        this.client.on('message', (topic, payload) => {
          console.log(`📨 MQTT Global: Message received on topic: ${topic}`);
          // Panggil semua handlers yang terdaftar
          this.messageHandlers.forEach((handler, key) => {
            handler(topic, payload);
          });
        });

      } catch (error) {
        console.error('❌ MQTT connection failed to start:', error);
      }
    }
    return this.client;
  }

  getClient(): MqttClient | null {
    if (!this.client) {
        return this.connect();
    }
    return this.client;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.messageHandlers.clear();
      console.log('🔌 MQTT: Terputus dari broker');
    }
  }

  publish(topic: string, message: string, options?: any) {
    if (this.client && this.client.connected) {
      console.log(`📤 MQTT: Publishing to ${topic}:`, message);
      this.client.publish(topic, message, options, (err) => {
        if (err) {
          console.error('❌ MQTT Publish Error:', err);
        } else {
          console.log(`✅ MQTT: Published to ${topic}`);
        }
      });
    } else {
      console.error('❌ MQTT client not connected. Cannot publish.');
      console.log('🔄 Attempting to reconnect...');
      this.connect();
    }
  }

  subscribe(topic: string, callback?: (error?: Error) => void) {
    if (this.client && this.client.connected) {
      console.log(`🔔 MQTT: Subscribing to ${topic}`);
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`❌ MQTT Subscribe Error on topic ${topic}:`, err);
          callback?.(err);
          return;
        }
        console.log(`✅ MQTT: Subscribed to ${topic}`);
        callback?.();
      });
    } else {
      console.error('❌ MQTT client not connected. Cannot subscribe.');
      const error = new Error('MQTT client not connected');
      callback?.(error);
    }
  }

  // Method untuk register message handler
  addMessageHandler(id: string, handler: (topic: string, payload: Buffer) => void) {
    this.messageHandlers.set(id, handler);
    console.log(`🎯 MQTT: Added message handler: ${id}`);
  }

  // Method untuk unregister message handler
  removeMessageHandler(id: string) {
    this.messageHandlers.delete(id);
    console.log(`🗑️ MQTT: Removed message handler: ${id}`);
  }
  
  unsubscribe(topic: string, callback?: (...args: any[]) => void) {
    if (this.client) {
        console.log(`🔕 MQTT: Unsubscribing from ${topic}`);
        this.client.unsubscribe(topic, (err) => {
            if(err) {
                console.error(`❌ Gagal berhenti berlangganan dari topik ${topic}:`, err);
            } else {
                console.log(`✅ MQTT: Unsubscribed from ${topic}`);
            }
        });
    }
  }
}

// Export satu instance agar koneksi bisa di-share
export const mqttService = new MqttService(); 