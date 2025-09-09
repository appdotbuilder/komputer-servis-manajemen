import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Product, CreateProductInput, User, CreateUserInput, FinancialReport } from '../../server/src/schema';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser] = useState({ role: 'admin' }); // Simulate logged-in user
  const [error, setError] = useState<string | null>(null);

  // Product form state
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    description: null,
    type: 'sparepart',
    price: 0,
    stock_quantity: 0,
    minimum_stock: 0
  });

  // User form state
  const [userForm, setUserForm] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'staff'
  });

  // Load data
  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError('Gagal memuat produk');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Gagal memuat pengguna');
    }
  }, []);

  const loadFinancialReport = useCallback(async () => {
    if (currentUser.role === 'staff') {
      setError('Staff tidak memiliki akses ke laporan keuangan');
      return;
    }

    try {
      setError(null);
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      
      const result = await trpc.getFinancialReport.query({
        period: 'monthly',
        start_date: lastMonth.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      });
      setFinancialReport(result);
    } catch (error) {
      console.error('Failed to load financial report:', error);
      setError('Gagal memuat laporan keuangan');
    }
  }, [currentUser.role]);

  useEffect(() => {
    loadProducts();
    loadUsers();
    loadFinancialReport();
  }, [loadProducts, loadUsers, loadFinancialReport]);

  // Handle product creation
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError(null);
      const response = await trpc.createProduct.mutate(productForm);
      setProducts((prev: Product[]) => [...prev, response]);
      setProductForm({
        name: '',
        description: null,
        type: 'sparepart',
        price: 0,
        stock_quantity: 0,
        minimum_stock: 0
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      setError('Gagal membuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError(null);
      const response = await trpc.createUser.mutate(userForm);
      setUsers((prev: User[]) => [...prev, response]);
      setUserForm({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'staff'
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      setError('Gagal membuat pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'sparepart': return '🔧 Suku Cadang';
      case 'accessory': return '📱 Aksesoris';
      case 'other': return '📦 Lainnya';
      default: return type;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '👨‍💼 Admin';
      case 'technician': return '🔧 Teknisi';
      case 'staff': return '👥 Staff';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'technician': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🖥️ Sistem Manajemen Servis Komputer
          </h1>
          <p className="text-lg text-gray-600">
            Kelola pelanggan, stok, dan transaksi dengan mudah
          </p>
          <div className="mt-4">
            <Badge className={`text-sm ${getRoleBadgeColor(currentUser.role)}`}>
              {getRoleLabel(currentUser.role)} - Pengguna Aktif
            </Badge>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ⚠️ {error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger value="products">📦 Produk</TabsTrigger>
            <TabsTrigger value="users">👥 Pengguna</TabsTrigger>
            <TabsTrigger value="reports" disabled={currentUser.role === 'staff'}>
              📊 Laporan
            </TabsTrigger>
            <TabsTrigger value="dashboard">🏠 Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ➕ Tambah Produk Baru
                </CardTitle>
                <CardDescription>
                  Tambahkan suku cadang, aksesoris, atau produk lainnya
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nama Produk</Label>
                      <Input
                        id="name"
                        placeholder="Nama produk"
                        value={productForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Kategori</Label>
                      <Select
                        value={productForm.type}
                        onValueChange={(value: 'sparepart' | 'accessory' | 'other') =>
                          setProductForm((prev: CreateProductInput) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sparepart">🔧 Suku Cadang</SelectItem>
                          <SelectItem value="accessory">📱 Aksesoris</SelectItem>
                          <SelectItem value="other">📦 Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      placeholder="Deskripsi produk (opsional)"
                      value={productForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setProductForm((prev: CreateProductInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Harga</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="Harga"
                        value={productForm.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProductForm((prev: CreateProductInput) => ({ 
                            ...prev, 
                            price: parseFloat(e.target.value) || 0 
                          }))
                        }
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stok Awal</Label>
                      <Input
                        id="stock"
                        type="number"
                        placeholder="Jumlah stok"
                        value={productForm.stock_quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProductForm((prev: CreateProductInput) => ({ 
                            ...prev, 
                            stock_quantity: parseInt(e.target.value) || 0 
                          }))
                        }
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Stok Minimum</Label>
                      <Input
                        id="minStock"
                        type="number"
                        placeholder="Batas minimum"
                        value={productForm.minimum_stock}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProductForm((prev: CreateProductInput) => ({ 
                            ...prev, 
                            minimum_stock: parseInt(e.target.value) || 0 
                          }))
                        }
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Menyimpan...' : '➕ Tambah Produk'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>📋 Daftar Produk</CardTitle>
                <CardDescription>
                  {products.length} produk terdaftar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Belum ada produk. Tambahkan produk pertama Anda!
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product: Product) => (
                      <Card key={product.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold text-lg">{product.name}</h3>
                              <Badge className="text-xs">
                                {getProductTypeLabel(product.type)}
                              </Badge>
                            </div>
                            
                            {product.description && (
                              <p className="text-sm text-gray-600">{product.description}</p>
                            )}
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-green-600">
                                Rp {product.price.toLocaleString('id-ID')}
                              </span>
                              <div className="text-right">
                                <div className="text-sm">
                                  Stok: <span className="font-semibold">{product.stock_quantity}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Min: {product.minimum_stock}
                                </div>
                              </div>
                            </div>
                            
                            {product.stock_quantity <= product.minimum_stock && (
                              <Alert className="border-yellow-200 bg-yellow-50">
                                <AlertDescription className="text-yellow-800 text-xs">
                                  ⚠️ Stok menipis!
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Tambah Pengguna Baru
                </CardTitle>
                <CardDescription>
                  Buat akun untuk admin, teknisi, atau staff
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="Username"
                        value={userForm.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <Input
                        id="fullName"
                        placeholder="Nama lengkap"
                        value={userForm.full_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={userForm.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={userForm.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="role">Peran</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value: 'admin' | 'technician' | 'staff') =>
                        setUserForm((prev: CreateUserInput) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih peran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">👨‍💼 Admin</SelectItem>
                        <SelectItem value="technician">🔧 Teknisi</SelectItem>
                        <SelectItem value="staff">👥 Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Membuat...' : '👤 Buat Pengguna'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>👥 Daftar Pengguna</CardTitle>
                <CardDescription>
                  {users.length} pengguna terdaftar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Belum ada pengguna terdaftar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user: User) => (
                      <Card key={user.id} className="border-l-4 border-l-green-500">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{user.full_name}</h3>
                              <p className="text-sm text-gray-600">@{user.username}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                              <div className="text-xs text-gray-500 mt-1">
                                {user.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {currentUser.role === 'staff' ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  🚫 Akses ditolak: Staff tidak dapat melihat laporan keuangan
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Laporan Keuangan
                  </CardTitle>
                  <CardDescription>
                    Ringkasan pendapatan dan transaksi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {financialReport ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm opacity-90">Total Pendapatan</p>
                            <p className="text-2xl font-bold">
                              Rp {financialReport.total_revenue.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-purple-400 to-pink-500 text-white">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm opacity-90">Pendapatan Servis</p>
                            <p className="text-2xl font-bold">
                              Rp {financialReport.service_revenue.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm opacity-90">Pendapatan Penjualan</p>
                            <p className="text-2xl font-bold">
                              Rp {financialReport.sales_revenue.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-indigo-400 to-cyan-500 text-white">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm opacity-90">Total Transaksi</p>
                            <p className="text-2xl font-bold">{financialReport.total_transactions}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">
                      Memuat laporan keuangan...
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏠 Dashboard
                </CardTitle>
                <CardDescription>
                  Selamat datang di sistem manajemen servis komputer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📦</div>
                        <h3 className="text-lg font-semibold">Produk</h3>
                        <p className="text-2xl font-bold text-blue-600">{products.length}</p>
                        <p className="text-sm text-gray-500">Total produk</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl mb-2">👥</div>
                        <h3 className="text-lg font-semibold">Pengguna</h3>
                        <p className="text-2xl font-bold text-green-600">{users.length}</p>
                        <p className="text-sm text-gray-500">Total pengguna</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🔧</div>
                        <h3 className="text-lg font-semibold">Sistem</h3>
                        <p className="text-sm font-semibold text-purple-600">Siap Digunakan</p>
                        <p className="text-sm text-gray-500">Status sistem</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;