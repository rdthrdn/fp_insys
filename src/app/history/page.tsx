'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { mqttService } from '@/services/mqttService';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import { generateSafeId } from '@/lib/utils';

// Tipe untuk setiap entri riwayat transaksi
interface HistoryEntry {
    id: string;
    date: string;
    description: string;
    credit?: number;
    debit?: number;
    type: 'IN' | 'OUT';
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRequestSentRef = useRef(false);
    const maxRetries = 3;
    
    const email = process.env.NEXT_PUBLIC_EMAIL || '';
    const paymentMethod = process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'dopay';
    
    // Function untuk request data dengan retry
    const requestHistoryData = useCallback(() => {
        if (isRequestSentRef.current) {
            console.log('⏳ History request already in progress, skipping...');
            return;
        }
        
        console.log(`🔄 Requesting history data (attempt ${retryCount + 1}/${maxRetries})...`);
        isRequestSentRef.current = true;
        
        const historyRequestTopic = 'B/D/bankit/wallet-history/request';
        const requestPayload = { email, payment_method: paymentMethod };
        
        console.log('📤 Sending history request:', requestPayload);
        console.log('📤 To topic:', historyRequestTopic);
        
        mqttService.publish(historyRequestTopic, JSON.stringify(requestPayload));
        
        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        // Set new timeout dengan waktu yang lebih lama
        timeoutRef.current = setTimeout(() => {
            console.log(`⏰ Request timeout (attempt ${retryCount + 1})`);
            isRequestSentRef.current = false;
            
            if (retryCount < maxRetries - 1) {
                console.log('🔄 Retrying request...');
                setRetryCount(prev => prev + 1);
                toast.error(`Timeout, mencoba lagi... (${retryCount + 2}/${maxRetries})`);
                // Retry setelah delay singkat
                setTimeout(() => {
                    requestHistoryData();
                }, 2000);
            } else {
                console.log('❌ Max retries reached');
                setIsLoading(false);
                setError('Timeout: Server tidak merespons setelah beberapa percobaan. Silakan refresh halaman.');
                toast.error('Gagal memuat riwayat setelah beberapa percobaan');
            }
        }, 20000); // 20 detik timeout
    }, [email, paymentMethod, retryCount, maxRetries]);
    
    // Retry manual function
    const handleRetry = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setRetryCount(0);
        isRequestSentRef.current = false;
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        setTimeout(() => {
            requestHistoryData();
        }, 500);
    }, [requestHistoryData]);

    useEffect(() => {
        console.log('🏦 History Page: Setting up MQTT connections...');
        console.log('📧 Email:', email);
        console.log('💳 Payment Method:', paymentMethod);
        
        // Topik MQTT
        const historyResponseTopic = 'B/D/bankit/wallet-history/response';
        const liveHistoryTopic = `B/D/bankit/${paymentMethod}/live-history`;
        
        console.log('📋 Topics configured:');
        console.log('  - Response:', historyResponseTopic);
        console.log('  - Live:', liveHistoryTopic);
        
        const handleMessage = (topic: string, payload: Buffer) => {
            console.log(`📨 History: Received message on topic: ${topic}`);
            console.log(`📄 History: Message content:`, payload.toString());
            
            try {
                const message = JSON.parse(payload.toString());
                console.log(`✅ History: Parsed message:`, message);
                
                if (topic === historyResponseTopic) {
                    console.log('📜 Processing wallet history response...');
                    
                    // Clear timeout saat dapat response
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = null;
                    }
                    isRequestSentRef.current = false;
                    
                    if (message.status === 'success' || message.status === true || message.code === 200 || message.status_code === 200) {
                        // Cek apakah data.transactions ada
                        if (message.data && message.data.transactions && Array.isArray(message.data.transactions)) {
                            const formattedHistory = message.data.transactions.map((item: any) => ({
                                id: item.id || item.transaction_id || generateSafeId('tx'),
                                date: dayjs(item.created_at || item.timestamp || new Date()).format('DD MMMM YYYY'),
                                description: item.description || 'Transaksi',
                                credit: item.type === 'credit' ? item.amount : undefined,
                                debit: item.type === 'debit' ? item.amount : undefined,
                                type: item.type === 'credit' ? 'IN' : 'OUT',
                            }));
                            console.log('✅ Formatted history:', formattedHistory);
                            setHistory(formattedHistory);
                            setError(null);
                            setRetryCount(0);
                            toast.success('Riwayat berhasil dimuat!');
                        } else if (message.data && Array.isArray(message.data)) {
                            // Coba jika data langsung array
                            console.log('🔄 Data is direct array, processing...');
                            const formattedHistory = message.data.map((item: any) => ({
                                id: item.id || item.transaction_id || generateSafeId('tx'),
                                date: dayjs(item.created_at || item.timestamp || new Date()).format('DD MMMM YYYY'),
                                description: item.description || 'Transaksi',
                                credit: item.type === 'credit' ? item.amount : undefined,
                                debit: item.type === 'debit' ? item.amount : undefined,
                                type: item.type === 'credit' ? 'IN' : 'OUT',
                            }));
                            console.log('✅ Formatted history (direct array):', formattedHistory);
                            setHistory(formattedHistory);
                            setError(null);
                            setRetryCount(0);
                            toast.success('Riwayat berhasil dimuat!');
                        } else {
                            console.log('⚠️ No transactions found in response');
                            console.log('📊 Response data structure:', message.data);
                            setHistory([]);
                            setError(null);
                            setRetryCount(0);
                            toast('Tidak ada riwayat transaksi', { icon: 'ℹ️' });
                        }
                    } else {
                        console.error('❌ History response error:', message);
                        setError(message.message || 'Gagal memuat riwayat.');
                        toast.error(message.message || 'Gagal memuat riwayat');
                    }
                    setIsLoading(false);
                } else if (topic === liveHistoryTopic) {
                    console.log('🔴 Processing live history update...');
                    
                    if (message.data) {
                        const newItem = message.data;
                        const formattedItem: HistoryEntry = {
                            id: newItem.id || generateSafeId('live'),
                            date: dayjs(newItem.created_at || new Date()).format('DD MMMM YYYY'),
                            description: message.message || newItem.description || 'Update Live',
                            credit: newItem.amount > 0 ? newItem.amount : undefined,
                            debit: newItem.amount < 0 ? Math.abs(newItem.amount) : undefined,
                            type: newItem.amount > 0 ? 'IN' : 'OUT',
                        };
                        console.log('✅ Live history item:', formattedItem);
                        setHistory(prev => [formattedItem, ...prev]);
                        toast.success('Riwayat transaksi diperbarui!');
                    }
                }
            } catch (e) {
                console.error('❌ Failed to parse message:', e);
                setError('Gagal memproses data dari server.');
                setIsLoading(false);
                isRequestSentRef.current = false;
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            }
        };

        // Setup MQTT connection
        const setupMqtt = () => {
            const client = mqttService.getClient();
            if (!client) {
                console.error('❌ MQTT client not available');
                setError('Koneksi MQTT tidak tersedia.');
                setIsLoading(false);
                return;
            }

            console.log('🔗 MQTT client connected:', client.connected);
            
            // Register message handler untuk halaman ini
            mqttService.addMessageHandler('history-page', handleMessage);

            // Subscribe dan request data
            console.log(`🔔 Subscribing to: ${historyResponseTopic}`);
            mqttService.subscribe(historyResponseTopic, (err) => {
                if (err) {
                    console.error('❌ Failed to subscribe to history response:', err);
                    setError('Gagal berlangganan ke topik riwayat.');
                    setIsLoading(false);
                } else {
                    console.log('✅ Subscribed to history response');
                    
                    // Subscribe untuk live updates
                    console.log(`🔔 Subscribing to live history: ${liveHistoryTopic}`);
                    mqttService.subscribe(liveHistoryTopic, (liveErr) => {
                        if (liveErr) {
                            console.error('❌ Failed to subscribe to live history:', liveErr);
                        } else {
                            console.log('✅ Subscribed to live history');
                        }
                        
                        // Request data setelah semua subscription selesai
                        setTimeout(() => {
                            requestHistoryData();
                        }, 1000);
                    });
                }
            });
        };

        const client = mqttService.connect();
        if (client?.connected) {
            console.log('🚀 Client already connected, setting up immediately');
            setupMqtt();
        } else {
            console.log('⏳ Waiting for client connection...');
            client?.on('connect', () => {
                console.log('🎉 Client connected, setting up MQTT');
                setupMqtt();
            });
        }

        // Cleanup function
        return () => {
            console.log('🧹 History page cleanup...');
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            isRequestSentRef.current = false;
            
            // Remove message handler
            mqttService.removeMessageHandler('history-page');
            
            // Unsubscribe dari topics
            mqttService.unsubscribe(historyResponseTopic);
            mqttService.unsubscribe(liveHistoryTopic);
        };
    }, [email, paymentMethod, requestHistoryData]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">🏦 Riwayat Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="text-gray-600">
                                Memuat riwayat transaksi...
                                {retryCount > 0 && (
                                    <span className="text-orange-600">
                                        <br />Percobaan {retryCount + 1} dari {maxRetries}
                                    </span>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-red-600">❌ Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <p className="text-red-600">{error}</p>
                            <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700">
                                🔄 Coba Lagi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Riwayat Transaksi</h1>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle>Semua Transaksi</CardTitle>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Select>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Jenis Transaksi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="in">Uang Masuk</SelectItem>
                                    <SelectItem value="out">Uang Keluar</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Waktu" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">7 Hari Terakhir</SelectItem>
                                    <SelectItem value="30d">30 Hari Terakhir</SelectItem>
                                    <SelectItem value="all">Semua Waktu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[100px]">Tanggal</TableHead>
                                    <TableHead className="min-w-[150px]">Keterangan</TableHead>
                                    <TableHead className="text-right min-w-[120px]">Saldo Masuk</TableHead>
                                    <TableHead className="text-right min-w-[120px]">Saldo Keluar</TableHead>
                                </TableRow>
                            </TableHeader>
                                                         <TableBody>
                                 {history.length === 0 ? (
                                     <TableRow>
                                         <TableCell colSpan={4} className="text-center py-8">
                                             <div className="text-gray-500">
                                                 <p className="text-lg mb-2">📋</p>
                                                 <p>Belum ada riwayat transaksi</p>
                                             </div>
                                         </TableCell>
                                     </TableRow>
                                 ) : (
                                     history.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium text-sm">{item.date}</TableCell>
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="text-right text-green-600 font-semibold">
                                            {item.credit ? formatCurrency(item.credit) : '-'}
                                        </TableCell>
                                                                                 <TableCell className="text-right text-red-600 font-semibold">
                                             {item.debit ? formatCurrency(item.debit) : '-'}
                                         </TableCell>
                                     </TableRow>
                                     ))
                                 )}
                             </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 