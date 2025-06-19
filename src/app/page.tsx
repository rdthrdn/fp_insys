'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpRight, Wallet, TrendingUp, CreditCard, Plus } from 'lucide-react';
import { mqttService } from '@/services/mqttService';
import Link from 'next/link';

// Definisikan tipe data untuk state agar lebih aman
interface AccountIdentity {
  email: string;
  username: string;
  kelas: string;
  group: string;
}

interface WalletIdentity {
  payment_method: string;
  balance: number;
}

export default function HomePage() {
  const [account, setAccount] = useState<AccountIdentity | null>(null);
  const [wallet, setWallet] = useState<WalletIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequestingBalance, setIsRequestingBalance] = useState(false);

  useEffect(() => {
    // Topik MQTT
    const email = process.env.NEXT_PUBLIC_EMAIL || '';
    const paymentMethod = process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'dopay';
    const baseTopic = `B/D/bankit`;
    const accountResponseTopic = `${baseTopic}/account-identity/response`;
    const walletResponseTopic = `${baseTopic}/wallet-identity/response`;
    const accountRequestTopic = `${baseTopic}/account-identity/request`;
    const walletRequestTopic = `${baseTopic}/wallet-identity/request`;
    const giveBalanceResponseTopic = `${baseTopic}/${paymentMethod}/give-balance/response`;
    const giveBalanceRequestTopic = `${baseTopic}/${paymentMethod}/give-balance/request`;

    // Handler untuk memproses pesan yang masuk
    const handleMessage = (topic: string, payload: Buffer) => {
      console.log(`Message received on topic ${topic}: ${payload.toString()}`);
      try {
        const message = JSON.parse(payload.toString());
        // Cek berbagai format status response
        const isSuccess = message.status === 'success' || 
                         message.status === true || 
                         message.code === 200 || 
                         message.status_code === 200;
                         
        if (!isSuccess) {
          console.error('❌ Response error:', message);
          let errorMessage = message.message || 'Terjadi kesalahan yang tidak diketahui.';
          
          // Handle specific error codes
          const errorCode = message.code || message.status_code;
          if (errorCode === 403) {
            errorMessage = '🔒 Tidak memiliki izin untuk mengakses data ini.';
          } else if (errorCode === 404) {
            errorMessage = '🔍 Data tidak ditemukan.';
          } else if (errorCode === 422) {
            errorMessage = '⚠️ Data yang dikirim tidak valid.';
          }
          
          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        if (topic === accountResponseTopic) {
          // Map data sesuai response API
          const accountData = {
            email: message.data.email,
            username: message.data.name,
            kelas: 'B', // Hardcode untuk kelompok
            group: 'D'  // Hardcode untuk kelompok
          };
          setAccount(accountData);
        } else if (topic === walletResponseTopic) {
          // Map data sesuai response API
          const walletData = {
            payment_method: message.data.payment_method,
            balance: message.data.balance
          };
          setWallet(walletData);
        } else if (topic === giveBalanceResponseTopic) {
          console.log('💰 Give Balance Response:', message);
          setIsRequestingBalance(false);
          if (message.status === true || message.status === 'success' || message.code === 200) {
            // Update wallet balance with new data
            if (message.data && message.data.current_balance !== undefined) {
              setWallet(prev => prev ? { ...prev, balance: message.data.current_balance } : null);
            }
            alert(`✅ ${message.message}`);
          } else {
            alert(`❌ ${message.message}`);
          }
        }
        
        // Tandai loading selesai jika kedua data sudah ada atau salah satu ada tanpa error
        if ((account && wallet) || message.data) {
            setIsLoading(false);
            setError(null); // Hapus error lama jika data baru masuk
        }

      } catch (e) {
        setError('Gagal memproses respons dari server.');
        console.error(e);
        setIsLoading(false);
      }
    };

    // Fungsi untuk setup koneksi dan subscription
    const setupMqtt = () => {
      const client = mqttService.getClient();
      if (!client) return;

      // Register message handler untuk halaman ini
      mqttService.addMessageHandler('dashboard-page', handleMessage);

      // Subscribe ke topik
      mqttService.subscribe(accountResponseTopic, (err) => {
        if (!err) mqttService.publish(accountRequestTopic, JSON.stringify({ email }));
      });
      mqttService.subscribe(walletResponseTopic, (err) => {
        if (!err) mqttService.publish(walletRequestTopic, JSON.stringify({ email, payment_method: paymentMethod }));
      });
      
      // Subscribe to give balance response
      mqttService.subscribe(giveBalanceResponseTopic);
    };

    const client = mqttService.connect();
    if (client?.connected) {
      setupMqtt();
    } else {
      client?.on('connect', setupMqtt);
    }

    // Cleanup saat komponen unmount
    return () => {
      mqttService.removeMessageHandler('dashboard-page');
      mqttService.unsubscribe(accountResponseTopic);
      mqttService.unsubscribe(walletResponseTopic);
      mqttService.unsubscribe(giveBalanceResponseTopic);
    };
  }, []);

  // Function to request balance from server
  const requestBalance = () => {
    const email = process.env.NEXT_PUBLIC_EMAIL || '';
    const paymentMethod = process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'dopay';
    const giveBalanceRequestTopic = `B/D/bankit/${paymentMethod}/give-balance/request`;
    
    setIsRequestingBalance(true);
    mqttService.publish(giveBalanceRequestTopic, JSON.stringify({ email }));
    
    // Set timeout untuk handling jika tidak ada response
    setTimeout(() => {
      setIsRequestingBalance(false);
    }, 10000);
  };

  if (isLoading && !error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Menghubungkan dan memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
        <p className="text-gray-600 text-sm sm:text-base">Kelola keuangan dan belanja dengan mudah</p>
      </div>

      {/* Profile Card */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="text-xl sm:text-2xl">{account?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{account?.username}</h2>
            <p className="text-gray-500 text-sm sm:text-base">{account?.email}</p>
            <p className="text-xs sm:text-sm text-gray-400">Kelas {account?.kelas} - Grup {account?.group}</p>
          </div>
        </div>
      </Card>

      {/* Wallet Card */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-700">E-Wallet Balance</h3>
          <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">
              {wallet ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(wallet.balance) : 'Memuat...'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 capitalize">Saldo {wallet?.payment_method}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={requestBalance} 
              disabled={isRequestingBalance}
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              {isRequestingBalance ? 'Meminta...' : 'Minta Saldo'}
            </Button>
            <Link href="/transfer">
              <Button className="gap-2 w-full sm:w-auto">
                <ArrowUpRight className="w-4 h-4" />
                Transfer
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Link href="/transfer">
          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">Transfer Uang</h4>
                <p className="text-xs sm:text-sm text-gray-500">Kirim uang ke teman</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/history">
          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">Riwayat Transaksi</h4>
                <p className="text-xs sm:text-sm text-gray-500">Lihat aktivitas keuangan</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/shop">
          <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">ShopIT</h4>
                <p className="text-xs sm:text-sm text-gray-500">Belanja produk IT</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
