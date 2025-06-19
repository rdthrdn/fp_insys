'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mqttService } from '@/services/mqttService';
import { toast } from 'react-hot-toast';
import { generateSafeId } from '@/lib/utils';

// Tipe untuk notifikasi transfer masuk
interface LiveUpdate {
    id: string;
    sender: string;
    amount: number;
    timestamp: Date;
}

export default function TransferPage() {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const myEmail = process.env.NEXT_PUBLIC_EMAIL || '';
  const myPaymentMethod = process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'dopay';
  
  useEffect(() => {
    const transferReceiveTopic = `B/D/bankit/${myPaymentMethod}/transfer/receive`;
    const transferResponseTopic = `B/D/bankit/dopay/transfer/send/response`;

    const handleMessage = (topic: string, payload: Buffer) => {
      try {
        const message = JSON.parse(payload.toString());
        
        if (topic === transferReceiveTopic) {
          const isSuccess = message.status === 'success' || 
                           message.status === true || 
                           message.code === 200 || 
                           message.status_code === 200;
                           
          if (isSuccess && message.data) {
              const newUpdate: LiveUpdate = {
                  id: message.data.transfer_id || generateSafeId('update'),
                  sender: message.data.sender_email || 'Unknown',
                  amount: message.data.amount || 0,
                  timestamp: new Date(),
              };
              setLiveUpdates(prev => [newUpdate, ...prev]);
              toast.success(`💰 ${message.message}`);
          }
        } else if (topic === transferResponseTopic) {
          setIsLoading(false);
          
          const isSuccess = message.status === 'success' || 
                           message.status === true || 
                           message.code === 200 || 
                           message.status_code === 200;
                           
          if (isSuccess) {
            toast.success(`✅ ${message.message || 'Transfer berhasil!'}`);
            // Reset form
            setReceiverEmail('');
            setAmount('');
            setPaymentMethod('');
          } else {
            const errorMsg = message.message || 'Transfer gagal.';
            const errorCode = message.code || message.status_code;
            
            if (errorCode === 422) {
              if (errorMsg.includes('Jumlah') || errorMsg.includes('amount')) {
                toast.error('💸 Jumlah transfer harus lebih dari 0!');
              } else if (errorMsg.includes('payment') || errorMsg.includes('E-Wallet')) {
                toast.error('💳 E-Wallet tidak valid!');
              } else {
                toast.error('⚠️ ' + errorMsg);
              }
            } else if (errorCode === 404) {
              toast.error('👤 Email penerima tidak ditemukan!');
            } else {
              toast.error('❌ ' + errorMsg);
            }
          }
        }
      } catch (error) {
        console.error("Gagal memproses notifikasi transfer:", error);
        setIsLoading(false);
      }
    };
    
    // Setup MQTT dengan message handler yang tepat
    const setupMqtt = () => {
      const client = mqttService.getClient();
      if (!client) return;

      // Register message handler untuk halaman ini
      mqttService.addMessageHandler('transfer-page', handleMessage);

      // Subscribe ke topik
      mqttService.subscribe(transferReceiveTopic);
      mqttService.subscribe(transferResponseTopic);
    };

    const client = mqttService.connect();
    if (client?.connected) {
      setupMqtt();
    } else {
      client?.on('connect', setupMqtt);
    }

    return () => {
      mqttService.removeMessageHandler('transfer-page');
      mqttService.unsubscribe(transferReceiveTopic);
      mqttService.unsubscribe(transferResponseTopic);
    };
  }, [myPaymentMethod]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverEmail || !amount || !paymentMethod) {
        toast.error('Harap isi semua kolom!');
        return;
    }

    if (Number(amount) <= 0) {
        toast.error('Jumlah transfer harus lebih dari 0!');
        return;
    }

    setIsLoading(true);
    const transferRequestTopic = 'B/D/bankit/dopay/transfer/send/request';
    const payload = {
        sender_email: myEmail,
        receiver_email: receiverEmail,
        receiver_payment_method: paymentMethod,
        amount: Number(amount)
    };

    mqttService.publish(transferRequestTopic, JSON.stringify(payload));
    toast('Memproses transfer...', { icon: '💸' });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Send Money Form */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Transfer Uang</h1>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleTransfer} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="receiver-email">Kirim ke (Email)</Label>
                  <Input 
                    id="receiver-email" 
                    type="email" 
                    placeholder="nama@example.com"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="payment-method">E-Wallet Penerima</Label>
                    <Select onValueChange={setPaymentMethod} value={paymentMethod} disabled={isLoading}>
                        <SelectTrigger id="payment-method" className="text-base">
                            <SelectValue placeholder="Pilih E-Wallet" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dopay">DoPay</SelectItem>
                            <SelectItem value="owo">OWO</SelectItem>
                            <SelectItem value="gopay">GoPay</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah (IDR)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="Masukkan jumlah" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                    min="1"
                    step="1000"
                    className="text-base"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? 'Memproses...' : 'Kirim Transfer'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Updates */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Transfer Masuk</h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notifikasi Real-time</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              {liveUpdates.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">💸</span>
                  </div>
                  <p className="text-gray-500 text-sm sm:text-base">Belum ada transfer masuk</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {liveUpdates.map((update) => (
                    <div key={update.id} className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-green-100 text-green-600 text-xs sm:text-sm">{update.sender.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{update.sender}</p>
                              <p className="text-xs sm:text-sm text-green-600 font-semibold">
                                  + {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(update.amount)}
                              </p>
                          </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{update.timestamp.toLocaleTimeString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 