'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Plus, Minus, X } from 'lucide-react';
import { mqttService } from '@/services/mqttService';
import { toast } from 'react-hot-toast';

interface Product {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url: string; 
}

interface BuyResponse {
    status: string | boolean;
    message: string;
    data?: any;
    status_code?: number;
    code?: number;
}

export default function ShopPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const [purchaseQuantity, setPurchaseQuantity] = useState(1);
    
    const email = process.env.NEXT_PUBLIC_EMAIL || '';
    const paymentMethod = process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'dopay';

    useEffect(() => {
        console.log('🛒 ShopIT Page: Setting up MQTT connections...');
        console.log('📧 Email:', email);
        console.log('💳 Payment Method:', paymentMethod);
        
        // Topik MQTT
        const catalogResponseTopic = 'B/D/shopit/product-catalog/response';
        const catalogRequestTopic = 'B/D/shopit/product-catalog/request';
        const detailResponseTopic = 'B/D/shopit/product-detail/response';
        const buyResponseTopic = 'B/D/shopit/buy/response';
        
        console.log('🛍️ Topics configured:');
        console.log('  - Catalog Response:', catalogResponseTopic);
        console.log('  - Catalog Request:', catalogRequestTopic);
        console.log('  - Detail Response:', detailResponseTopic);
        console.log('  - Buy Response:', buyResponseTopic);
        
        const handleMessage = (topic: string, payload: Buffer) => {
            console.log(`📨 ShopIT: Received message on topic: ${topic}`);
            console.log(`📄 ShopIT: Message content:`, payload.toString());
            
            try {
                const message = JSON.parse(payload.toString());
                console.log(`✅ ShopIT: Parsed message:`, message);
                
                if (topic === catalogResponseTopic) {
                    console.log('📦 Processing product catalog response...');
                    
                    if (message.status === 'success' || message.status === true || message.code === 200 || message.status_code === 200) {
                        // Cek apakah data ada dan merupakan array
                        if (message.data && Array.isArray(message.data)) {
                            console.log('✅ Products found:', message.data.length);
                            console.log('📦 First product sample:', message.data[0]);
                            setProducts(message.data);
                            setError(null);
                        } else if (message.data && message.data.products && Array.isArray(message.data.products)) {
                            // Coba jika ada wrapper products
                            console.log('🔄 Products in wrapper, processing...');
                            console.log('✅ Products found:', message.data.products.length);
                            setProducts(message.data.products);
                            setError(null);
                        } else {
                            console.log('⚠️ No products found in response');
                            console.log('📊 Response data structure:', message.data);
                            setProducts([]);
                            setError(null);
                        }
                    } else {
                        console.error('❌ Catalog response error:', message);
                        setError(message.message || 'Gagal memuat katalog produk.');
                    }
                    setIsLoading(false);
                } else if (topic === detailResponseTopic) {
                    console.log('🔍 Processing product detail response...');
                    setIsLoadingDetail(false);
                    
                    if (message.status === 'success' || message.status === true || message.code === 200 || message.status_code === 200) {
                        console.log('✅ Product detail:', message.data);
                        setSelectedProduct(message.data);
                        setIsModalOpen(true); // Open modal when product detail received
                    } else {
                        console.error('❌ Detail response error:', message);
                        toast.error(message.message || "Gagal mengambil detail produk.");
                    }
                } else if (topic === buyResponseTopic) {
                    console.log('💳 Processing buy response...');
                    
                    const response: BuyResponse = message;
                    if (response.status === 'success' || response.status === true || response.status_code === 200 || response.code === 200) {
                        console.log('✅ Purchase successful');
                        toast.success(response.message || 'Pembelian berhasil!');
                        // Refresh katalog untuk update stok
                        console.log('🔄 Refreshing product catalog...');
                        setTimeout(() => {
                            mqttService.publish(catalogRequestTopic, JSON.stringify({}));
                        }, 1000);
                        setSelectedProduct(null); // Tutup detail view
                        setIsModalOpen(false); // Close modal
                    } else {
                        console.error('❌ Purchase failed:', response);
                        const errorMsg = response.message || 'Pembelian gagal.';
                        const statusCode = response.status_code || response.code;
                        
                        if (statusCode === 400) {
                            if (errorMsg.includes('uang') || errorMsg.includes('saldo')) {
                                toast.error('💳 Saldo E-Wallet tidak mencukupi!');
                            } else if (errorMsg.includes('inventaris') || errorMsg.includes('stok')) {
                                toast.error('📦 Stok produk tidak mencukupi!');
                            } else {
                                toast.error(errorMsg);
                            }
                        } else if (statusCode === 404) {
                            toast.error('🔍 Produk tidak ditemukan!');
                        } else if (statusCode === 422) {
                            if (errorMsg.includes('quantity') || errorMsg.includes('jumlah')) {
                                toast.error('📊 Jumlah pembelian tidak valid! (harus lebih dari 0)');
                            } else {
                                toast.error('⚠️ ' + errorMsg);
                            }
                        } else {
                            toast.error('❌ ' + errorMsg);
                        }
                    }
                }
            } catch (e) {
                console.error('❌ Failed to parse message:', e);
                setError('Terjadi kesalahan pada koneksi.');
                setIsLoading(false);
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
            mqttService.addMessageHandler('shop-page', handleMessage);

            // Subscribe ke topik dan request katalog
            console.log(`🔔 Subscribing to: ${catalogResponseTopic}`);
            mqttService.subscribe(catalogResponseTopic, (err) => {
                if (err) {
                    console.error('❌ Failed to subscribe to catalog response:', err);
                    setError('Gagal berlangganan ke topik katalog.');
                    setIsLoading(false);
                } else {
                    console.log('✅ Subscribed to catalog response, requesting products...');
                    console.log('📤 Sending catalog request to:', catalogRequestTopic);
                    
                    // Delay sebentar untuk memastikan subscription sudah aktif
                    setTimeout(() => {
                        mqttService.publish(catalogRequestTopic, JSON.stringify({}));
                        console.log('📮 Catalog request sent!');
                    }, 500);
                }
            });
            
            console.log(`🔔 Subscribing to: ${detailResponseTopic}`);
            mqttService.subscribe(detailResponseTopic, (err) => {
                if (err) {
                    console.error('❌ Failed to subscribe to detail response:', err);
                } else {
                    console.log('✅ Subscribed to detail response');
                }
            });
            
            console.log(`🔔 Subscribing to: ${buyResponseTopic}`);
            mqttService.subscribe(buyResponseTopic, (err) => {
                if (err) {
                    console.error('❌ Failed to subscribe to buy response:', err);
                } else {
                    console.log('✅ Subscribed to buy response');
                }
            });

            // Set timeout untuk loading
            setTimeout(() => {
                if (isLoading) {
                    console.log('⏰ Request timeout, no response received');
                    setIsLoading(false);
                    setError('Timeout: Tidak mendapat respons dari server.');
                }
            }, 10000); // 10 detik timeout
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

        // Cleanup
        return () => {
            console.log('🧹 Cleaning up shop page subscriptions');
            mqttService.removeMessageHandler('shop-page');
            mqttService.unsubscribe(catalogResponseTopic);
            mqttService.unsubscribe(detailResponseTopic);
            mqttService.unsubscribe(buyResponseTopic);
        };
    }, []);

    const handleProductClick = (product: Product) => {
        console.log('🔍 Requesting product detail for:', product.id);
        setPurchaseQuantity(1); // Reset quantity when selecting new product
        setIsLoadingDetail(true);
        setSelectedProduct(product); // Set basic product info first
        setIsModalOpen(true); // Open modal immediately with loading state
        
        const detailRequestTopic = 'B/D/shopit/product-detail/request';
        mqttService.publish(detailRequestTopic, JSON.stringify({ product_id: product.id }));
        
        // Add shimmer toast
        toast('Memuat detail produk...', { 
            icon: '🔍',
            duration: 2000 
        });
    };

    const handleBuy = (product: Product, quantity: number = 1) => {
        console.log('💳 Initiating purchase for:', product.id, 'Quantity:', quantity);
        const buyRequestTopic = 'B/D/shopit/buy/request';
        const payload = {
            buyer_email: email,
            payment_method: paymentMethod,
            product_id: product.id,
            quantity: quantity,
        };
        console.log('📤 Sending buy request:', payload);
        mqttService.publish(buyRequestTopic, JSON.stringify(payload));
        toast(`Memproses pembelian ${quantity} item...`, { icon: '🛍️' });
    };

    // Filter produk berdasarkan pencarian
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleImageError = (productId: string) => {
        console.log('Image load error for product:', productId);
        setImageErrors(prev => new Set([...prev, productId]));
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        setPurchaseQuantity(1);
        setIsLoadingDetail(false);
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold">ShopIT - Katalog Produk</h1>
                <p className="text-gray-500 text-sm sm:text-base">Temukan produk IT terbaik untuk kebutuhan Anda.</p>
                <div className="relative w-full max-w-lg mx-auto mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input 
                        placeholder="Cari produk..." 
                        className="pl-10 text-base" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Memuat produk...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                        <p className="text-lg mb-2">❌</p>
                        <p>{error}</p>
                    </div>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-gray-500">
                        <p className="text-4xl mb-4">🛒</p>
                        <p className="text-lg">Belum ada produk tersedia</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {filteredProducts.map((product) => (
                            <Card 
                                key={product.id} 
                                className="group overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-2 hover:scale-105 border-2 hover:border-blue-200" 
                                onClick={() => handleProductClick(product)}
                            >
                                <CardContent className="p-0">
                                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                                        {imageErrors.has(product.id) ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 group-hover:bg-gray-300 transition-colors duration-300">
                                                <div className="text-center text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                                                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">📦</div>
                                                    <p className="text-xs">No Image</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Image 
                                                src={product.image_url || '/placeholder.svg'} 
                                                alt={product.name} 
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                                onError={() => handleImageError(product.id)}
                                            />
                                        )}
                                        {/* Overlay gradient on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        {/* Click indicator */}
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                                            <Search className="w-3 h-3 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-4 group-hover:bg-gray-50 transition-colors duration-300">
                                        <h3 className="font-semibold line-clamp-2 mb-2 text-sm sm:text-base group-hover:text-blue-900 transition-colors duration-300">{product.name}</h3>
                                        <p className={`text-xs sm:text-sm mb-2 transition-colors duration-300 ${product.quantity > 0 ? 'text-green-600 group-hover:text-green-700' : 'text-red-600 group-hover:text-red-700'}`}>
                                            Stok: {product.quantity}
                                        </p>
                                        <p className="font-bold text-blue-600 text-sm sm:text-base group-hover:text-blue-700 transition-colors duration-300">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(product.price)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Tidak ada produk yang ditemukan</p>
                        </div>
                    )}
                </>
            )}
            
            {/* Product Detail Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-bounce-in">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {isLoadingDetail ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    Memuat detail produk...
                                </div>
                            ) : (
                                selectedProduct?.name || 'Detail Produk'
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedProduct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            {/* Product Image */}
                            <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                                {isLoadingDetail ? (
                                    // Loading skeleton for image
                                    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-4xl animate-pulse">📦</div>
                                        </div>
                                    </div>
                                ) : imageErrors.has(selectedProduct.id) ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <div className="text-center text-gray-500">
                                            <div className="text-6xl mb-4">📦</div>
                                            <p className="text-sm">Image not available</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Image 
                                        src={selectedProduct.image_url || '/placeholder.svg'} 
                                        alt={selectedProduct.name} 
                                        fill
                                        className="object-cover"
                                        onError={() => handleImageError(selectedProduct.id)}
                                    />
                                )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="space-y-4">
                                {isLoadingDetail ? (
                                    // Loading skeleton for product info
                                    <div className="space-y-4">
                                        {/* Title skeleton */}
                                        <div className="space-y-2">
                                            <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse"></div>
                                            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse w-3/4"></div>
                                        </div>
                                        
                                        {/* Description skeleton */}
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
                                            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-5/6"></div>
                                            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-4/6"></div>
                                        </div>
                                        
                                        {/* Stock and price skeleton */}
                                        <div className="space-y-3">
                                            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-24"></div>
                                            <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse w-40"></div>
                                        </div>
                                        
                                        {/* Quantity skeleton */}
                                        <div className="space-y-3">
                                            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-16"></div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
                                                <div className="h-6 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
                                                <div className="h-10 w-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <h3 className="text-2xl font-bold mb-2">{selectedProduct.name}</h3>
                                            <p className="text-gray-600">
                                                Produk IT berkualitas tinggi dengan spesifikasi terbaik. 
                                                Cocok untuk kebutuhan profesional maupun personal.
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-lg">
                                                Stok: <span className={`font-medium ${selectedProduct.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {selectedProduct.quantity}
                                                </span>
                                            </p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedProduct.price)}
                                            </p>
                                        </div>
                                        
                                        {/* Quantity Selector */}
                                        {selectedProduct.quantity > 0 && (
                                            <div className="space-y-3">
                                                <Label className="text-base">Jumlah:</Label>
                                                <div className="flex items-center gap-3">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setPurchaseQuantity(prev => Math.max(1, prev - 1))}
                                                        disabled={purchaseQuantity <= 1}
                                                        className="h-10 w-10 p-0"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </Button>
                                                    <span className="w-16 text-center font-medium text-lg">{purchaseQuantity}</span>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setPurchaseQuantity(prev => Math.min(selectedProduct.quantity, prev + 1))}
                                                        disabled={purchaseQuantity >= selectedProduct.quantity}
                                                        className="h-10 w-10 p-0"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="text-base text-gray-700">
                                                    Total: <span className="font-bold text-blue-600 text-lg">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedProduct.price * purchaseQuantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeModal}>
                            Tutup
                        </Button>
                        {isLoadingDetail ? (
                            <Button disabled className="bg-gray-300">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Memuat...
                            </Button>
                        ) : (
                            <>
                                {selectedProduct && selectedProduct.quantity > 0 && (
                                    <Button 
                                        onClick={() => handleBuy(selectedProduct, purchaseQuantity)}
                                        className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
                                    >
                                        Beli {purchaseQuantity} Item
                                    </Button>
                                )}
                                {selectedProduct && selectedProduct.quantity === 0 && (
                                    <Button disabled>
                                        Stok Habis
                                    </Button>
                                )}
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 